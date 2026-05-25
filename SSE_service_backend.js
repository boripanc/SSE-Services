const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // 1. จัดการเรื่อง CORS (อนุญาตให้เรียกข้ามโดเมนได้ เผื่อทดสอบบน DevPortal)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ตอบกลับ Request แบบ OPTIONS (Preflight) ทันที
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 2. กำหนด Path ที่ต้องการให้ทำงานเป็น SSE
  if (req.url === '/testSSE' || req.url === '/') {
    console.log(`\n[${new Date().toLocaleTimeString()}] 📥 Client connected for SSE (Path: ${req.url})`);

    // 🌟 ตั้งค่า HTTP Headers บังคับให้เป็น Event Stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let counter = 0;
    const maxChunks = 15; // จำนวนข้อความทั้งหมดที่จะสตรีม (เช่น ส่ง 15 ครั้ง)
    const intervalTime = 1500; // ส่งข้อมูลทุกๆ 1.5 วินาที (1,500 ms)

    // 🌟 จำลองการทยอยส่งข้อมูล (เหมือน AI ค่อยๆ พิมพ์คำตอบ)
    const streamInterval = setInterval(() => {
      counter++;
      
      const payload = {
        id: counter,
        message: `จำลองการพิมพ์... ข้อความที่ ${counter}`,
        timestamp: new Date().toISOString()
      };

      // รูปแบบข้อมูลของ SSE ต้องขึ้นต้นด้วย "data: " และลงท้ายด้วย "\n\n" เสมอ
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      console.log(`[${new Date().toLocaleTimeString()}] 📡 ส่ง Chunk ${counter}/${maxChunks} สำเร็จ`);

      // 🌟 ตรวจสอบว่าส่งครบตามจำนวนที่กำหนดหรือยัง
      if (counter >= maxChunks) {
        // แนะนำให้ส่ง Event เพื่อบอก Client ว่าจบการทำงานแล้ว (เป็น Best Practice)
        res.write(`event: end\ndata: [DONE]\n\n`); 
        
        clearInterval(streamInterval);
        res.end(); // ปิด Connection อย่างเป็นทางการ
        console.log(`[${new Date().toLocaleTimeString()}] 🏁 ส่งข้อมูลครบถ้วน ปิดการเชื่อมต่อเรียบร้อย`);
      }
    }, intervalTime);

    // 🌟 ดักจับกรณีที่ Client (หรือ Gateway) ตัดสายทิ้งไปก่อนที่ส่งครบ
    req.on('close', () => {
      console.log(`[${new Date().toLocaleTimeString()}] ❌ Client (หรือ Gateway) ตัดการเชื่อมต่อไปก่อน`);
      clearInterval(streamInterval); // หยุดการประมวลผลทันที เพื่อไม่ให้กิน CPU
    });

  } else {
    // 3. จัดการกรณีพิมพ์ Path ผิด
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Not Found", message: "Please use /testSSE" }));
  }
});

// ป้องกัน Server Timeout จากฝั่ง HTTP Parser ของ Node.js 
server.keepAliveTimeout = 0;
server.headersTimeout = 0;

// เปิดรับทุก IP (0.0.0.0) เพื่อให้ทดสอบผ่าน ngrok/Pinggy หรือเครื่องอื่นได้
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock SSE Backend is running!`);
  console.log(`👉 ทดสอบด้วยคำสั่ง: curl -N -v http://localhost:${PORT}/testSSE`);
});