import env, { SERVER_API } from './env.js';
import { sleep } from './src/render/utils.js';
import PixiApp from './src/index'
import { uid } from 'uid';
import { io } from 'socket.io-client';
import axios from 'axios';
// import 'regenerator-runtime/runtime'
import { ALTTEXT_KO } from './altText-constants.js';

// not used anymore in 2022
// const WEATHER_API = `http://192.168.0.105:3005/weather`

class App {
  constructor() {
    this.creatureName = window.CREATURE_NAME;
    this.pathname = window.location.pathname
    this.isTest = this.pathname == '/test'
  }

  async setup() {
    // intro html
    const introDiv = document.querySelector('.intro');
    if (introDiv) {
      introDiv.classList.add("hidden")
      setTimeout(() => {
        if (introDiv)
          introDiv.remove()
      }, 2000)
    }

    window.TEMPERATURE = 5
    window.HUMIDITY = 55

    this.user = this.createOrFetchUser()
    console.log("this.user ----------- ", this.user);
    // getAssistMode()

    this.serverPort = window.location.hostname.includes('iptime') ? '1012' : '3000'
    this.serverUrl = `http://${window.location.hostname}`

    this.pixiApp = new PixiApp({ isAdmin: this.pathname == '/admin' })

    this.fetchWeatherData()
    setInterval(this.fetchWeatherData, 10000)
    
    await this.pixiApp.loadAssets()
    this.pixiApp.resizeAppToWindow()
    // update 2022: send url query to match garden position
    // console.log("window.location.href ", window.location.href);
    let gardenSectionX = "";
    let gardenSectionY = "";
    const fullUrl = window.location.href;

    // if url has query for garden location
    if(fullUrl.includes("?")) {
      const queries = fullUrl.split('?')[1].split("&");

      for(const q of queries) {
        // console.log(q);
        let coordinateArr = q.split("=");
        if(coordinateArr[0] === "x" || coordinateArr[0] === "X") {
          gardenSectionX = coordinateArr[1];
        } else if(coordinateArr[0] === "y" || coordinateArr[0] === "Y") {
          gardenSectionY = coordinateArr[1];
        }
      }
      console.log('send garden coord: ', gardenSectionX, gardenSectionY, window.GARDEN)
    }
    
    console.log("before send socket, ", this.user, window.MYCREATURETYPE);

    this.socket = await io(`${this.serverUrl}:${this.serverPort}`, {
      query: {
        uid: this.user.uid,
        creatureName: this.user.creatureName,
        creatureType: window.MYCREATURETYPE,
        gardenSectionX,
        gardenSectionY
      }
    })

    console.log("after connect socket ========= ", this.user.uid)
    // client's UID
    window.UID = this.user.uid

    this.socket.on('connect', this.onSocketConnect)
    this.socket.on('connect_error', this.onSocketConnectError)
    this.socket.on('usersUpdate', this.onUsersUpdate)
    this.socket.on('creatures', this.onCreatures)
    this.socket.on('creaturesUpdate', this.onCreaturesUpdate)
    this.socket.on('adminConnectBroadcast', this.onAdminConnect)
    this.socket.on('creatureEvolveBroadcast', this.onCreatureEvolve)
    this.socket.on('disconnect', () => { window.location.reload() })

    this.selfGarden = null  // may need null check selfGarden
    this.onlineCreatures = {}
    this.onlineUsers = {}
    this.initData = {
      creatures: false,
      users: false,
      firstRender: false
    }

    window.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  onVisibilityChange = (e) => {
    const active = (document.visibilityState == 'visible')
    if (!active) {
      this.socket.disconnect()
      this.initData.firstRender = false
      this.pixiApp.stop()
      this.onlineCreatures = {}
      this.onlineUsers = {}
      console.log("visibility check ======== not active")
    } else {
      this.socket.connect()      
      // this.pixiApp.reset()
      console.log("visibility check ======== active, connect socket");
    }

    console.log("windown visibility change function ======", this.onVisibilityChange);

  }

  hasAdminSequence() {
    if (window.location.search.indexOf('sequence') != -1) return true
    return false
  }
  
  getIsAdmin() {
    return (this.pathname == '/admin')
  }

  renderAppIfReady() {
    // console.log("renderAppIfready ========= ")
    if (this.initData.creatures && this.initData.users && !this.initData.firstRender) {
      this.pixiApp.render()
      this.initData.firstRender = true
    }
  }

  onSocketConnect = () => {
    if (this.getIsAdmin()) {
      this.socket.emit('adminConnect', {query: {creatureType: "all"}})
    }
  }

  onSocketConnectError = (error) => {
		console.log("onSocketConnectError /////////// ", error);
  }

  onAdminConnect = () => {
    if (this.getIsAdmin()) return
    this.pixiApp.reset()
  }

  sendEvolveCreature = (id) => {
    this.socket.emit('creatureEvolve', { id })

    // console.log("sendEvolveCreature-------------", id)
    if(!window.IS_ADMIN){
      if(window.AUDIO) {
        //console.log("CREATURE EVOLVE SOUND:", window.AUDIO._sounds)
        if(!window.AUDIO._sounds?.creatureTapSound?.isPlaying){ // if not playing
            window.AUDIO.play('creatureTapSound')
        }
      }
    }
  }

  sendGardenTap = (coords) => {
    this.socket.emit('gardenTap', coords)

    if(!window.IS_ADMIN){
      if(window.AUDIO) {
        //console.log("GARDE TAP SOUND:", window.AUDIO._sounds)
        if(!window.AUDIO._sounds?.gardenTapSound?.isPlaying){ // if not playing
          window.AUDIO.play('gardenTapSound')
        }  
      }
    }
  }

  onCreatureEvolve = ({ id }) => {
    this.pixiApp.evolveCreature(id)
  }

  onUsersUpdate = (users) => {
    // console.log('onUsersUpdate: ', JSON.stringify(users).length, Object.keys(users).length)
    // get single user's garden data

    const currUser = users.find((u => (u.uid == this.user.uid)))
    //console.log(users, this.user.uid, currUser); // error when first enter: [] 'uid exists', undefined

    if(!currUser) {
      return;
    }
    this.selfGarden = currUser ? currUser.gardenSection : null
    this.selfUid = currUser ? currUser.uid : null

    // get all online users
    this.onlineUsers = users.reduce((acc, el) => {
      acc[el.uid] = el
      return acc
    }, {})

    this.updateOnlineCreatures()

    this.initData.users = true
    this.renderAppIfReady()
  }

  onCreatures = (creaturesString) => {
    const creatures = JSON.parse(creaturesString)
    // console.log('onCreatures: ', JSON.stringify(creatures).length, Object.keys(creatures).length)

    this.updateOnlineCreatures(creatures)    

    this.initData.creatures = true
    this.renderAppIfReady()
  }

  updateOnlineCreatures = (creatures) => {
    let onlineCreatures = creatures || Object.values(this.onlineCreatures)

    this.onlineCreatures = onlineCreatures.reduce((acc, el) => {
      if (!!this.onlineUsers[el.owner?.uid]) {
        acc[el.id] = el
      }
      return acc
    }, {})

    this.pixiApp.updateOnlineCreatures(this.onlineUsers, this.onlineCreatures)
    return this.onlineCreatures  
  }

  onCreaturesUpdate = (creaturesToUpdate) => {
    this.pixiApp.updateCreatureData(creaturesToUpdate)
  }

  createOrFetchUser() {
    console.log(this.isTest);
    if (this.isTest) {
      return {
        uid: uid(),
        name: '',
        creatureName: this.creatureName
      }  
    }

    let user = localStorage.getItem("user")

    // need to update if existing user gives new creature name
    if(user){
      let updateUser =  JSON.parse(user)
      updateUser.creatureName = this.creatureName;
      updateUser = JSON.stringify(updateUser)
      localStorage.setItem("user", updateUser)
      user = updateUser
    }

    if (!user) {
      user = JSON.stringify({
        uid: uid(),
        name: '',
        creatureName: this.creatureName
      })
      localStorage.setItem("user", user)
    }    

    return JSON.parse(user)
  }

  // update 2022
  async fetchWeatherData() {
    let weather
    try {
      let res = await axios.get(SERVER_API + "/api/weather/latest");
      weather = await res.data;

    } catch (error) {
      console.log("client WEATHER API ERROR ------------ ", error)
      return new Promise((res, rej) => res())
    } finally {
      if (weather && weather.data) {
        const weatherData = weather.data;

        window.TEMPERATURE = weatherData.temperature;
        window.HUMIDITY = weatherData.humidity;  
      }  
    }
  }
}

window.startApp = () => {
  window.APP = new App()
  window.APP.setup()
}

window.submitLogin = (event) => {
  event.preventDefault();
  // const creatureOptions = await document.getElementById("creatureOptions");
  // console.log(creatureOptions);
  const selectedCreature = document.querySelector('input[name="creatureOptions"]:checked').value;
  if(selectedCreature) {
    window.MYCREATURETYPE = selectedCreature;
  }
  // event.srcElement
  console.log("submitlogin ---- selected creature ", selectedCreature);
  console.log("window.MYCREATURETYPE assigned? ", window.MYCREATURETYPE);

  window.CREATURE_NAME = event.target[0].value;
  
  // Please don't touch this, it's hacky af, but it fixes a weird bug on Android.
  const inputEl = document.getElementById('creatureName')
  inputEl.setAttribute('readonly', 'readonly')
  inputEl.setAttribute('disabled', true)
  setTimeout(() => {
    inputEl.blur()
    inputEl.removeAttribute('readonly')
    inputEl.removeAttribute('disabled')
    setTimeout(() => {
      window.startApp()
    }, 100)
  }, 100) 
}

// ACCESSIBILITY
/*
window.enableAccess = (event) => {
  let btn = document.getElementById("accessBtn");
  let img = document.getElementById("accessImg");
  
  if(window.ASSIST_MODE) {
    console.log("deactivate")
    window.ASSIST_MODE = false;
    img.alt = ALTTEXT_KO.common.deactivateAccess;
    btn.style.backgroundColor = 'rgba(0, 0, 0, 0)';

  } else {
    console.log("activate")
    window.ASSIST_MODE = true;
    img.alt = ALTTEXT_KO.common.activateAccess;
    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
  }

  setAssistMode()
}

function setAssistMode() {
  localStorage.setItem('ASSIST_MODE', window.ASSIST_MODE)
}

function getAssistMode(){
  let currAssistMode = JSON.parse(localStorage.getItem('ASSIST_MODE'));

  if(currAssistMode) {
    window.ASSIST_MODE = currAssistMode
  } else {
    window.ASSIST_MODE = false
    setAssistMode()
  }
}
*/
window.ASSIST_MODE = false;
window.addEventListener('online', () => window.location.reload());
window.addEventListener('offline', () => window.location.reload());
window.addEventListener("resize", (event) => {
  location.reload();
});
window.addEventListener("orientationchange", (event) => {
  location.reload();
});

window.addEventListener('DOMContentLoaded', () => {
  let userStr = localStorage.getItem("user")
  let user = (userStr) ? JSON.parse(userStr) : ""
  //console.log("DOMContentLoaded====================== user?", user);

  if (window.location.pathname == '/test' || window.location.pathname == '/admin' || (user.creatureName && user.creatureName != "")) {
    window.CREATURE_NAME = user.creatureName
    let el = document.getElementById('introId')
    el.classList.add("hidden")
    setTimeout(() => {
      el.remove()
    }, 2000)    
    
    window.startApp()
  } else {
    document.querySelector(".topWrap").style.opacity = 1;
    document.querySelector(".bottomWrap").style.opacity = 1;
  }
  // console.log("dome content loaded ========= ");
  // console.log('window garden: ', window.GARDEN)
  // console.log('window mycreaturetype: ', window.MYCREATURETYPE);

  // window.SCREENREADER = document.getElementById('description')
  // window.SCREENREADER.textContent = ALTTEXT_KO[window.GARDEN].intro;
})