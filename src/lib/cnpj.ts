export function normalizeCnpj(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 14);
}

export function formatCnpj(value: unknown) {
  const digits = normalizeCnpj(value);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidCnpj(value: unknown) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (length: number) => {
    let factor = length - 7;
    let sum = 0;
    for (let index = length; index >= 1; index -= 1) {
      sum += Number(cnpj[length - index]) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const result = 11 - (sum % 11);
    return result > 9 ? 0 : result;
  };

  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}
