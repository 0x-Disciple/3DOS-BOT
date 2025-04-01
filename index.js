const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk').default;
const banner = require('./config/banner')

const API_SECRET_FILE = 'data.txt';
const MAX_RATE_LIMIT = 60; // Jumlah permintaan maksimum yang diizinkan per periode (misalnya 60)

// Mendapatkan user-agent acak
const getRandomUserAgent = () => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// Fungsi untuk mendapatkan data pengguna menggunakan API Secret dan Bearer Token
async function getUserData(apiSecret, bearerToken) {
    const url = `https://api.dashboard.3dos.io/api/profile/api/${apiSecret}`;
    try {
        const response = await axios.post(url, {}, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'User-Agent': getRandomUserAgent(),
                'Accept': '*/*',
                'Origin': 'chrome-extension://lpindahibbkakkdjifonckbhopdoaooe',
            }
        });

        const rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining']);
        const rateLimitLimit = parseInt(response.headers['x-ratelimit-limit']);

        // Cek apakah masih ada permintaan yang tersisa
        if (rateLimitRemaining <= 0) {
            // Jika tidak ada sisa, tunggu 1 jam sampai sisa kembali penuh
            console.log(chalk.yellow(`Rate limit exceeded. Waiting for 1 hour until next attempt...`));

            // Tunggu selama 1 jam (3600000 ms) sebelum mencoba lagi
            await new Promise(resolve => setTimeout(resolve, 3600000));

            // Setelah menunggu, coba lagi untuk mengambil data
            return getUserData(apiSecret, bearerToken);
        }

        // Tampilkan hasil jika berhasil
        if (response.data && response.data.status === "Success") {
            const { email, todays_earning } = response.data.data;
            console.log(chalk.green(`Email: ${email}`));
            console.log(chalk.green(`Today's Earnings: ${todays_earning}`));
            console.log(chalk.green('Ping Success!'));  // Output setelah berhasil melakukan ping
        } else {
            console.log(chalk.red(`Failed to fetch user data: ${response.data.message}`));
        }
    } catch (error) {
        console.error(chalk.red('Error fetching user data:'), chalk.yellow(error.message));
    }
}

// Fungsi untuk memproses akun-akun dari file
async function processAccounts() {
    try {
        const apiSecretsAndTokens = fs.readFileSync(API_SECRET_FILE, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line);

        if (apiSecretsAndTokens.length === 0) {
            console.log(chalk.red('No API secrets found in the file.'));
            return;
        }

        for (const line of apiSecretsAndTokens) {
            const [apiSecret, bearerToken] = line.split(':').map(item => item.trim());
            if (!apiSecret || !bearerToken) {
                console.log(chalk.red(`Invalid format in line: ${line}`));
                continue;
            }

            console.log(chalk.blue(`Fetching data for API Secret: ${apiSecret.substring(0, 5)}...`));

            // Gunakan bearer token yang sudah ada untuk mengambil data pengguna
            await getUserData(apiSecret, bearerToken);
        }
    } catch (error) {
        console.error(chalk.red('Error reading API secrets file:'), chalk.yellow(error.message));
    }
}

// Fungsi untuk auto ping yang menunggu sampai sisa rate limit kembali penuh
async function autoPing() {
    // Ambil data akun dan pastikan bahwa rate limit sudah cukup untuk melakukan ping
    await processAccounts();
}

// Fetch data setiap 5 menit (300000 ms) jika rate limit memungkinkan
setInterval(autoPing, 300000);

// Jalankan pertama kali saat script dimulai
autoPing();
