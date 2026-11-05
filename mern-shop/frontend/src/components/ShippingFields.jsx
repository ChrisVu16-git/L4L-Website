export default function ShippingFields({ value, onChange, errors = {}, disabled = false }) {
  const fields = [
    ['recipientName','Họ tên người nhận','Nguyễn Văn An','name'],
    ['phone','Số điện thoại','0912345678','tel'],
    ['address','Số nhà, tên đường','12 Nguyễn Huệ','street-address'],
    ['ward','Phường/Xã','Phường Sài Gòn','address-level2'],
    ['city','Tỉnh/Thành phố','TP. Hồ Chí Minh','address-level1'],
    ['postalCode','Mã bưu chính (không bắt buộc)','','postal-code'],
    ['country','Quốc gia','Việt Nam','country-name'],
  ];
  return <>{fields.map(([key,label,placeholder,autoComplete]) => <label key={key}>
    {label}<input className="input" name={key} type={key === 'phone' ? 'tel' : 'text'} autoComplete={autoComplete}
      required={key !== 'postalCode'} maxLength={key === 'address' ? 200 : key === 'phone' ? 20 : key === 'postalCode' ? 10 : 100}
      placeholder={placeholder} value={value[key] || ''} disabled={disabled} aria-invalid={Boolean(errors[key])}
      aria-describedby={errors[key] ? `shipping-${key}-error` : undefined}
      onChange={event => onChange({ ...value, [key]: event.target.value })} />
    {errors[key] && <span id={`shipping-${key}-error`} className="field-error" role="alert">{errors[key]}</span>}
  </label>)}</>;
}
