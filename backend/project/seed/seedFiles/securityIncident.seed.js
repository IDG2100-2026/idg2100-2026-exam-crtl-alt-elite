import { SecurityIncident } from "../../models/securityIncident.js";
import { User } from "../../models/user.js";

export async function seedSecurityIncidents() {
    await SecurityIncident.deleteMany({});
    console.log("Deleted existing security incidents");

    const users = await User.find({ role: "user" });

    const incidents = [
        {
            type: "ip_mismatch",
            userId: users[0].userId,
            ip: "192.168.1.100",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            detail: `Token IP: 192.168.1.50, Request IP: 192.168.1.100`,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
            type: "ip_mismatch",
            userId: users[1].userId,
            ip: "10.0.0.55",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            detail: `Token IP: 10.0.0.1, Request IP: 10.0.0.55`,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5)
        },
        {
            type: "ip_mismatch",
            userId: users[2].userId,
            ip: "172.16.0.200",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
            detail: `Token IP: 172.16.0.1, Request IP: 172.16.0.200`,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
        },
        {
            type: "rate_limit",
            userId: null,
            ip: "203.0.113.42",
            userAgent: "python-requests/2.28.0",
            detail: "Rate limit exceeded on GET /api/games",
            createdAt: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
            type: "rate_limit",
            userId: users[3].userId,
            ip: "198.51.100.77",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            detail: "Rate limit exceeded on POST /api/auth/login",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3)
        },
        {
            type: "rate_limit",
            userId: null,
            ip: "192.0.2.100",
            userAgent: "curl/7.88.1",
            detail: "Rate limit exceeded on GET /api/users",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48)
        }
    ];

    await SecurityIncident.insertMany(incidents);
    console.log(`Inserted ${incidents.length} security incidents`);
}
