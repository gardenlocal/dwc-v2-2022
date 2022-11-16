// window.GARDEN = 'moss'
// window.GARDEN = 'lichen'
// window.GARDEN = 'mushroom'
window.GARDEN = 'all'
window.MYCREATURETYPE = 'all'
window.MOVE_DURATION = 5000;  //  1000 is 1 second
window.GROW_ELEMENT_INTERIM = 3000; // waiting time until next element draws
window.GROW_ELEMENT_DURATION = 6000; // duration time of one element to grow

// update 2022
// SERVER_API = "http://localhost:3000"; // only in local test environment, not pi network.
export const SERVER_API = "http://192.168.100.1:3000";
export const WEATHER_API = `https://garden-local-dev.hoonyland.workers.dev/weather/latest`;