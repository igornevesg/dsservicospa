"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, MapPin, Minus, Pencil, RefreshCw, UserPlus, X } from "lucide-react";
import { formatCnpj, normalizeCnpj } from "@/lib/cnpj";
import { formatCpf, isValidCpf, normalizeCpf } from "@/lib/cpf";
import styles from "./registrations.module.css";

type Company={public_id:string;display_name:string;legal_name:string;tax_id:string|null;address:string|null;is_active:boolean};
type Site={public_id:string;name:string;address:string|null;latitude:number|null;longitude:number|null;allowed_radius_meters:number;is_active:boolean;companies?:{public_id:string;display_name:string}|null};
type Employee={public_id:string;full_name:string;registration_number:string|null;cpf_last4:string|null;job_title:string|null;shift_pattern:string|null;status:string;companies?:{public_id:string;display_name:string}|null;work_sites?:{public_id:string;name:string}|null};
type Entity="company"|"site"|"employee";
type Editing={entity:Entity;publicId:string}|null;

const emptyCompany={legalName:"",displayName:"",taxId:"",address:""};
const emptySite={companyId:"",name:"",address:"",latitude:"",longitude:"",radius:"150"};
const emptyEmployee={companyId:"",siteId:"",fullName:"",registration:"",cpf:"",jobTitle:"",shift:""};

export function RegistrationsDashboard({popupEntity="",defaultCompanyId=""}:{popupEntity?:Entity|"";defaultCompanyId?:string}){
  const [role,setRole]=useState("");
  const [companies,setCompanies]=useState<Company[]>([]);
  const [sites,setSites]=useState<Site[]>([]);
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [editing,setEditing]=useState<Editing>(null);
  const [cnpjLookup,setCnpjLookup]=useState({loading:false,message:"",error:""});
  const [company,setCompany]=useState(emptyCompany);
  const [site,setSite]=useState(emptySite);
  const [employee,setEmployee]=useState(emptyEmployee);

  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/dashboard",{cache:"no-store"});
    const body=await response.json();
    if(response.status===401){window.location.assign("/administrativo/login?redirect=/administrativo/ponto/cadastros");return;}
    if(!response.ok)throw new Error(body.error);
    setRole(body.role);setCompanies(body.companies||[]);setSites(body.sites||[]);setEmployees(body.employees||[]);
    const preferred=body.companies?.some((item:Company)=>item.public_id===defaultCompanyId)?defaultCompanyId:"";
    const first=preferred||body.companies?.[0]?.public_id||"";
    const firstSite=body.sites?.find((item:Site)=>item.companies?.public_id===first)?.public_id||"";
    setSite(current=>({...current,companyId:current.companyId||first}));
    setEmployee(current=>({...current,companyId:current.companyId||first,siteId:current.siteId||firstSite}));
  },[defaultCompanyId]);

  useEffect(()=>{void load().catch(reason=>setError(reason.message));},[load]);
  useEffect(()=>{
    if(editing?.entity==="company"){setCnpjLookup({loading:false,message:"",error:""});return;}
    const cnpj=normalizeCnpj(company.taxId);
    if(cnpj.length!==14){setCnpjLookup({loading:false,message:"",error:""});return;}
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setCnpjLookup({loading:true,message:"",error:""});
      try{
        const response=await fetch(`/api/admin/cnpj/${cnpj}`,{cache:"no-store",signal:controller.signal});
        const body=await response.json();
        if(!response.ok)throw new Error(body.error||"Não foi possível consultar o CNPJ.");
        setCompany(current=>normalizeCnpj(current.taxId)===cnpj?{...current,legalName:body.legalName,displayName:body.tradeName||body.legalName,address:body.address||current.address}:current);
        setCnpjLookup({loading:false,message:`Dados encontrados${body.status?` · Situação ${body.status}`:""}. Você ainda pode editar os campos.`,error:""});
      }catch(reason){if(!controller.signal.aborted)setCnpjLookup({loading:false,message:"",error:reason instanceof Error?reason.message:"Não foi possível consultar o CNPJ."});}
    },500);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[company.taxId,editing]);

  async function submit(path:string,payload:Record<string,unknown>,success:string,entity:Entity,reset:()=>void){
    setBusy(true);setError("");setMessage("");
    try{
      const activeEdit=editing?.entity===entity?editing:null;
      const response=await fetch(path,{method:activeEdit?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(activeEdit?{...payload,publicId:activeEdit.publicId}:payload)});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error);
      reset();setEditing(null);
      const finalMessage=activeEdit?"Cadastro atualizado.":success;
      setMessage(popupEntity?`${finalMessage} Esta aba será fechada.`:finalMessage);
      if(popupEntity){const channel=new BroadcastChannel("ds-servicos-cadastros");channel.postMessage({type:"registration-created",entity,publicId:body.publicId||null});channel.close();window.setTimeout(()=>window.close(),250);}else await load();
    }catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível salvar o cadastro.");}finally{setBusy(false);}
  }

  async function remove(path:string,publicId:string,label:string){
    if(!window.confirm(`Remover ${label}? O cadastro sairá das listas, mas o histórico será preservado.`))return;
    setBusy(true);setError("");setMessage("");
    try{const response=await fetch(`${path}?publicId=${encodeURIComponent(publicId)}`,{method:"DELETE"});const body=await response.json();if(!response.ok)throw new Error(body.error);setMessage(`${label} removido com segurança.`);await load();}
    catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível remover.");}finally{setBusy(false);}
  }

  function editCompany(item:Company){setEditing({entity:"company",publicId:item.public_id});setCompany({legalName:item.legal_name,displayName:item.display_name,taxId:formatCnpj(item.tax_id||""),address:item.address||""});setError("");setMessage("");window.scrollTo({top:0,behavior:"smooth"});}
  function editSite(item:Site){setEditing({entity:"site",publicId:item.public_id});setSite({companyId:item.companies?.public_id||"",name:item.name,address:item.address||"",latitude:item.latitude?.toString()||"",longitude:item.longitude?.toString()||"",radius:String(item.allowed_radius_meters||150)});setError("");setMessage("");}
  function editEmployee(item:Employee){const companyId=item.companies?.public_id||"";setEditing({entity:"employee",publicId:item.public_id});setEmployee({companyId,siteId:item.work_sites?.public_id||"",fullName:item.full_name,registration:item.registration_number||"",cpf:"",jobTitle:item.job_title||"",shift:item.shift_pattern||""});setError("");setMessage("");}
  function cancelEdit(){setEditing(null);setCompany(emptyCompany);setSite(current=>({...emptySite,companyId:current.companyId}));setEmployee(current=>({...emptyEmployee,companyId:current.companyId,siteId:current.siteId}));setError("");}

  const availableSites=sites.filter(item=>item.companies?.public_id===employee.companyId);
  if(error&&!role)return <div className={styles.readOnly}><h2>Sessão administrativa não reconhecida</h2><p>{error}</p><a className={styles.loginLink} href="/administrativo/login?redirect=/administrativo/ponto/cadastros">Entrar novamente</a></div>;
  const roleName=role==="admin"?"Administrador":role==="supervisor"?"Supervisor":role==="operator"?"Operador":"Verificando sessão...";
  if(role==="operator")return <div className={styles.readOnly}><p className={styles.role}>Perfil ativo: <strong>{roleName}</strong></p><h2>Cadastros</h2><p>Seu perfil de operador pode consultar e lançar horários, mas somente administradores e supervisores podem criar ou editar cadastros.</p></div>;

  return <div className={styles.wrapper}>
    <div className={styles.accessInfo}><div><small>Perfil ativo</small><strong>{roleName}</strong></div>{role!=="admin"&&<p>Somente o perfil Administrador pode cadastrar empresas. Supervisores cadastram postos e funcionários da empresa vinculada.</p>}</div>
    {(message||error)&&<p className={error?styles.error:styles.success}>{error||message}</p>}

    {role==="admin"&&(!popupEntity||popupEntity==="company")&&<section>
      <h2><Building2/>{editing?.entity==="company"?"Editar empresa":"Nova empresa"}</h2>
      <form className={styles.form} onSubmit={(event:FormEvent)=>{event.preventDefault();void submit("/api/admin/companies",company,"Empresa cadastrada.","company",()=>setCompany(emptyCompany));}}>
        <label>CNPJ<input inputMode="numeric" autoComplete="off" maxLength={18} placeholder="00.000.000/0000-00" value={company.taxId} onChange={e=>setCompany({...company,taxId:formatCnpj(e.target.value)})}/></label>
        <label>Razão social<input required value={company.legalName} onChange={e=>setCompany({...company,legalName:e.target.value})}/></label>
        <label>Nome de exibição<input required value={company.displayName} onChange={e=>setCompany({...company,displayName:e.target.value})}/></label>
        <label className={styles.wide}>Endereço<input value={company.address} onChange={e=>setCompany({...company,address:e.target.value})}/></label>
        {(cnpjLookup.loading||cnpjLookup.message||cnpjLookup.error)&&<p className={`${styles.lookupStatus} ${cnpjLookup.loading?styles.lookupLoading:""} ${cnpjLookup.error?styles.lookupError:""}`}>{cnpjLookup.loading?<><RefreshCw/>Consultando CNPJ...</>:cnpjLookup.error?cnpjLookup.error:<><CheckCircle2/>{cnpjLookup.message}</>}</p>}
        <div className={styles.formActions}><button disabled={busy||cnpjLookup.loading}>{editing?.entity==="company"?"Salvar alterações":"Cadastrar empresa"}</button>{editing?.entity==="company"&&<button type="button" className={styles.cancelButton} onClick={cancelEdit}><X/>Cancelar</button>}</div>
      </form>
      {!popupEntity&&<div className={styles.cards}>{companies.map(item=><article key={item.public_id}><div className={styles.cardTitle}><strong>{item.display_name}</strong><div className={styles.actionButtons}><button type="button" className={styles.editButton} aria-label={`Editar empresa ${item.display_name}`} title="Editar empresa" disabled={busy} onClick={()=>editCompany(item)}><Pencil/></button><button type="button" className={styles.removeButton} aria-label={`Remover empresa ${item.display_name}`} title="Remover empresa" disabled={busy} onClick={()=>void remove("/api/admin/companies",item.public_id,`a empresa ${item.display_name}`)}><Minus/></button></div></div><small>{item.legal_name}</small></article>)}</div>}
    </section>}

    {(!popupEntity||popupEntity==="site")&&<section>
      <h2><MapPin/>{editing?.entity==="site"?"Editar posto":"Novo posto"}</h2>
      <form className={styles.form} onSubmit={(event:FormEvent)=>{event.preventDefault();void submit("/api/admin/work-sites",site,"Posto cadastrado.","site",()=>setSite(current=>({...emptySite,companyId:current.companyId})));}}>
        <label>Empresa<select value={site.companyId} onChange={e=>setSite({...site,companyId:e.target.value})}>{companies.map(item=><option key={item.public_id} value={item.public_id}>{item.display_name}</option>)}</select></label>
        <label>Nome do posto<input required value={site.name} onChange={e=>setSite({...site,name:e.target.value})}/></label>
        <label>Raio permitido (m)<input type="number" min="20" max="2000" value={site.radius} onChange={e=>setSite({...site,radius:e.target.value})}/></label>
        <label className={styles.wide}>Endereço<input value={site.address} onChange={e=>setSite({...site,address:e.target.value})}/></label>
        <label>Latitude<input inputMode="decimal" value={site.latitude} onChange={e=>setSite({...site,latitude:e.target.value})}/></label>
        <label>Longitude<input inputMode="decimal" value={site.longitude} onChange={e=>setSite({...site,longitude:e.target.value})}/></label>
        <div className={styles.formActions}><button disabled={busy}>{editing?.entity==="site"?"Salvar alterações":"Cadastrar posto"}</button>{editing?.entity==="site"&&<button type="button" className={styles.cancelButton} onClick={cancelEdit}><X/>Cancelar</button>}</div>
      </form>
      {!popupEntity&&<div className={styles.cards}>{sites.map(item=><article key={item.public_id}><div className={styles.cardTitle}><strong>{item.name}</strong><div className={styles.actionButtons}><button type="button" className={styles.editButton} aria-label={`Editar posto ${item.name}`} title="Editar posto" disabled={busy} onClick={()=>editSite(item)}><Pencil/></button><button type="button" className={styles.removeButton} aria-label={`Remover posto ${item.name}`} title="Remover posto" disabled={busy} onClick={()=>void remove("/api/admin/work-sites",item.public_id,`o posto ${item.name}`)}><Minus/></button></div></div><small>{item.companies?.display_name} · {item.address||"Sem endereço"}</small></article>)}</div>}
    </section>}

    {(!popupEntity||popupEntity==="employee")&&<section>
      <h2><UserPlus/>{editing?.entity==="employee"?"Editar funcionário":"Novo funcionário"}</h2>
      <form className={styles.form} onSubmit={(event:FormEvent)=>{event.preventDefault();void submit("/api/admin/employees",employee,"Funcionário cadastrado.","employee",()=>setEmployee(current=>({...emptyEmployee,companyId:current.companyId,siteId:current.siteId})));}}>
        <label>Empresa<select value={employee.companyId} onChange={e=>{const companyId=e.target.value;setEmployee({...employee,companyId,siteId:sites.find(item=>item.companies?.public_id===companyId)?.public_id||""});}}>{companies.map(item=><option key={item.public_id} value={item.public_id}>{item.display_name}</option>)}</select></label>
        <label>Posto<select required value={employee.siteId} onChange={e=>setEmployee({...employee,siteId:e.target.value})}><option value="">Selecione</option>{availableSites.map(item=><option key={item.public_id} value={item.public_id}>{item.name}</option>)}</select></label>
        <label>Nome completo<input required value={employee.fullName} onChange={e=>setEmployee({...employee,fullName:e.target.value})}/></label>
        <label>Matrícula (opcional)<input value={employee.registration} onChange={e=>setEmployee({...employee,registration:e.target.value})}/></label>
        <label>CPF<input required={editing?.entity!=="employee"} inputMode="numeric" autoComplete="off" maxLength={14} placeholder={editing?.entity==="employee"?`Manter atual •••${employees.find(item=>item.public_id===editing.publicId)?.cpf_last4||""}`:"000.000.000-00"} value={employee.cpf} onChange={e=>{const value=formatCpf(e.target.value);e.currentTarget.setCustomValidity(normalizeCpf(value).length===11&&!isValidCpf(value)?"Informe um CPF válido.":"");setEmployee({...employee,cpf:value});}} onBlur={e=>e.currentTarget.setCustomValidity((editing?.entity==="employee"&&!e.currentTarget.value)||isValidCpf(e.currentTarget.value)?"":"Informe um CPF válido.")}/></label>
        <label>Cargo<input value={employee.jobTitle} onChange={e=>setEmployee({...employee,jobTitle:e.target.value})}/></label>
        <label>Turno<input value={employee.shift} onChange={e=>setEmployee({...employee,shift:e.target.value})}/></label>
        <div className={styles.formActions}><button disabled={busy}>{editing?.entity==="employee"?"Salvar alterações":"Cadastrar funcionário"}</button>{editing?.entity==="employee"&&<button type="button" className={styles.cancelButton} onClick={cancelEdit}><X/>Cancelar</button>}</div>
      </form>
      {!popupEntity&&<div className={styles.table}><table><thead><tr><th>Funcionário</th><th>Matrícula</th><th>Empresa</th><th>Posto</th><th>Cargo</th><th>Turno</th><th aria-label="Ações"/></tr></thead><tbody>{employees.map(item=><tr key={item.public_id}><td>{item.full_name}</td><td>{item.registration_number||"—"}</td><td>{item.companies?.display_name}</td><td>{item.work_sites?.name||"—"}</td><td>{item.job_title||"—"}</td><td>{item.shift_pattern||"—"}</td><td><div className={styles.actionButtons}><button type="button" className={styles.editButton} aria-label={`Editar funcionário ${item.full_name}`} title="Editar funcionário" disabled={busy} onClick={()=>editEmployee(item)}><Pencil/></button><button type="button" className={styles.removeButton} aria-label={`Remover funcionário ${item.full_name}`} title="Remover funcionário" disabled={busy} onClick={()=>void remove("/api/admin/employees",item.public_id,`o funcionário ${item.full_name}`)}><Minus/></button></div></td></tr>)}</tbody></table></div>}
    </section>}
    {busy&&<p className={styles.loading}><RefreshCw/>Processando...</p>}
  </div>;
}
