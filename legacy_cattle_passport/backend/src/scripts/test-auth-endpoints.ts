import axios from 'axios';

async function testAuth() {
  const baseUrl = 'http://127.0.0.1:4000/api/v1';

  console.log('--- Testing Built-in Account Login (Farmer Murugan) ---');
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      usernameOrPhone: 'farmer_murugan',
      password: 'Password@123',
    });
    console.log('✅ Built-in Login Success:', loginRes.data.success);
    console.log('User Role:', loginRes.data.data.user.roles);
  } catch (err: any) {
    console.error('❌ Built-in Login Failed:', err.response?.data || err.message);
  }

  console.log('\n--- Testing Built-in Account Login (Admin Sundaram) ---');
  try {
    const adminRes = await axios.post(`${baseUrl}/auth/login`, {
      usernameOrPhone: 'admin_aavin',
      password: 'Password@123',
    });
    console.log('✅ Admin Login Success:', adminRes.data.success);
  } catch (err: any) {
    console.error('❌ Admin Login Failed:', err.response?.data || err.message);
  }

  console.log('\n--- Testing New Farmer Registration ---');
  const testPhone = `9842${Math.floor(100000 + Math.random() * 900000)}`;
  const testUser = `farmer_test_${Date.now()}`;
  try {
    const regRes = await axios.post(`${baseUrl}/auth/register`, {
      fullName: 'Test Dairy Farmer',
      username: testUser,
      phone: testPhone,
      password: 'Password@123',
      role: 'farmer',
      village: 'Melur Rural',
    });
    console.log('✅ Registration Success:', regRes.data);

    console.log('\n--- Testing Login with Newly Registered User ---');
    const newLoginRes = await axios.post(`${baseUrl}/auth/login`, {
      usernameOrPhone: testUser,
      password: 'Password@123',
    });
    console.log('✅ New User Login Success:', newLoginRes.data.success);
    console.log('User Profile:', newLoginRes.data.data.user.fullName, 'Role:', newLoginRes.data.data.user.roles);
  } catch (err: any) {
    console.error('❌ Registration/Login Test Failed:', err.response?.data || err.message);
  }

  process.exit(0);
}

testAuth().catch(console.error);
