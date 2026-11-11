export function formatOrderDelivery(customer) {
  switch (customer?.delivery_method) {
    case 'pickup':
      return 'Retiro en taller (Providencia)';
    case 'shipping':
      return customer.shipping_city ? `Despacho a ${customer.shipping_city}` : 'Despacho a domicilio';
    default:
      return 'Entrega por coordinar';
  }
}
