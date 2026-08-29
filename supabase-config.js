// Supabase public browser configuration.
window.JPT_SUPABASE_URL = 'https://qrkbhrmxejtpvheplath.supabase.co';
window.JPT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xySAr0cGnVCaC_sgtwk8Zw_IW_b5sgh';
document.addEventListener('submit', function(e) {
  if (window.sb) {
    window.sb.from('orders').insert([{
      order_data: 'New Order Received',
      created_at: new Date()
    }]);
  }
});
