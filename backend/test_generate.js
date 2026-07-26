const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/posts', {
      topic: "Remote Work",
      size: "Medium",
      tone: "Professional",
      frequency: "1/day"
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.error("FAILURE:", err.response?.data || err.message);
  }
}
test();
