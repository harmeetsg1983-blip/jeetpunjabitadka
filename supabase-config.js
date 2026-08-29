// Supabase public browser configuration.
window.JPT_SUPABASE_URL = 'https://qrkbhrmxejtpvheplath.supabase.co';
window.JPT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xySAr0cGnVCaC_sgtwk8Zw_IW_b5sgh';

document.addEventListener('submit', function(e) {
  try {
    var cart = window.cart || [];
    var total = window.cartTotal || 0;
    if (window.sb) {
      window.sb.from('orders').insert([{
        order_id: 'JPT' + Math.floor(100000 + Math.random() * 900000),
        customer_name: document.getElementById('cust-name')?.value || 'Customer',
        customer_phone: document.getElementById('cust-phone')?.value || '',
        items: JSON.stringify(cart),
        total_amount: total,
        status: 'new',
        created_at: new Date().toISOString()
      }]);
    }
  } catch(err) {}
});
