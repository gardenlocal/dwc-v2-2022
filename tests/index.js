const puppeteer = require('puppeteer');

function sleep(s) {
    return new Promise((res, rej) => {
        setTimeout(() => res(), s)
    })
}
    
  

(async () => {
    let pages = []    
    const browser = await puppeteer.launch({ headless: false });
    for (let i = 0; i < 10; i++) {                
        const page = await browser.newPage();
        await page.goto('http://localhost:1234/test');
        // await page.goto('http://dwc2-taeyoon-studio.iptime.org:1013/test');
        
        await page.setDefaultNavigationTimeout(0); 
        pages.push(page)
        //await page.screenshot({ path: 'example.png' });
        await sleep(1000)

        // setTimeout(async () => {
        //     await page.close()
        // }, Math.random() * 10000 + 20000)        
        //browsers.push(browser)        
    }

    await sleep(400000)

    for (let i = 0; i < pages.length; i++) {
        pages[i].close()
        await sleep(Math.random() * 2000)
    }
    await browser.close()
    // for (let i = 0; i < browsers.length; i++) {
    //     await browsers[i].close();      
    // }
})();