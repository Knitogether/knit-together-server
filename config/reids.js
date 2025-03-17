const redis = require("redis");

const connectRedis = async () => {
    const client = redis.createClient({
      socket: {
        host: "127.0.0.1",  // VM의 공인 IP 주소
        port: 6379,                // Redis 기본 포트
      },
    });

    client.on("connect", () => console.log("✅ Redis Connected!"));
    client.on("error", (err) => console.error("❌ Redis Error:", err));
    
    client.connect();
    return client;
};

module.exports = connectRedis;