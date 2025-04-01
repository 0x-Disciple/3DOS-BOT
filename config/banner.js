const figlet = require('figlet');
const chalk = require('chalk').default;

function displayBanner() {
    const banner = figlet.textSync('Crypto Kidzs', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    })
    console.log(chalk.green(banner));
    console.log(chalk.yellow('========================================='))
    console.log(chalk.magenta('Github   : https://github.com/0x-Disciple'));
    console.log(chalk.magenta('Telegram : https://t.me/CryptoKidzs'));
    console.log(chalk.yellow('========================================='))
}
displayBanner();