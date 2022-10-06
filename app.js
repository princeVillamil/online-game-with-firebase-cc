const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
};


function randomFromArray(array){
  return array[Math.floor(Math.random() * array.length)]
}
function getKeyString(x, y){
  return `${x}x${y}`
}

// Player color
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];
function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x,y){

  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x,y)]
  return (
    blockedNextSpace || 
    x>=mapData.maxX ||
    x<mapData.minX ||
    y>=mapData.maxY ||
    y<mapData.minY
  )
}
function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

(function(){ //Fired as soon as page loads

  let playerId
  let playerRef
  let players = {}
  let playerElements = {}
  let coins = {}
  let coinElement = {}

  const gameContainer = document.querySelector('.game-container')
  const playerNameInput = document.querySelector('#player-name')
  const playerColorButton = document.querySelector('#player-color')

  function placeCoin(){
    const {x,y} = getRandomSafeSpot()
    const coinRef = firebase.database().ref(`coins/${getKeyString(x,y)}`)
    coinRef.set({
      x,
      y,
    })

    const coinTimeouts = [7000, 7000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x,y){
    const key = getKeyString(x,y)
    if(coins[key]){
      firebase.database().ref(`coins/${key}`).remove()
      playerRef.update({
        coins: players[playerId].coins + 1,
      })
    }
  }

  function handleArrowPress(xChange, yChange){
    const newX = players[playerId].x + xChange
    const newY = players[playerId].y + yChange
    if(!isSolid(newX, newY)){
      //Move to the next space
      players[playerId].x = newX
      players[playerId].y = newY
      if(xChange === 1){
        players[playerId].direction = 'right'
      }
      if(xChange === -1){
        players[playerId].direction = 'left'
      }
      playerRef.set(players[playerId])
      attemptGrabCoin(newX, newY)
    }

  }

  function initGame(){

    new KeyPressListener('ArrowUp', ()=> handleArrowPress(0, -1))
    new KeyPressListener('ArrowDown', ()=> handleArrowPress(0, 1))
    new KeyPressListener('ArrowLeft', ()=> handleArrowPress(-1, 0))
    new KeyPressListener('ArrowRight', ()=> handleArrowPress(1, 0))

    const allPlayerRef = firebase.database().ref('players')
    const allCoinsRef = firebase.database().ref('coins')

    allPlayerRef.on('value', (snapshot)=>{ 
      //Fires when this value changes
      players = snapshot.val() || {}
      Object.keys(players).forEach((key)=>{
        const charState = players[key]
        let el = playerElements[key]
        el.querySelector('.Character_name').innerText = charState.name
        el.querySelector('.Character_coins').innerText = charState.coins
        el.setAttribute('data-color', charState.color)
        el.setAttribute('data-direction', charState.direction)
        const left = 16 * charState.x + 'px'
        const top = 16 * charState.y - 4 + 'px'
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
  
      })
    })
    allPlayerRef.on('child_added', (snapshot)=>{
      //Fires when a new node is added to the tree - like when player join
      const addedPlayer = snapshot.val()
      const charElement = document.createElement('div')
      charElement.classList.add("Character", 'grid-cell')
      if(addedPlayer.id === playerId){
        charElement.classList.add('you')
      }
      charElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `)
      playerElements[addedPlayer.id] = charElement

      // fill in some initial state
      charElement.querySelector('.Character_name').innerText = addedPlayer.name
      charElement.querySelector('.Character_coins').innerText = addedPlayer.coins
      charElement.setAttribute('data-color', addedPlayer.color)
      charElement.setAttribute('data-direction', addedPlayer.direction)
      const left = 16 * addedPlayer.x + 'px'
      const top = 16 * addedPlayer.y - 4 + 'px'
      charElement.style.transform =  `translate3d(${left}, ${top}, 0)`

      gameContainer.appendChild(charElement)
    })
    // Remove players
    allPlayerRef.on("child_removed", (snapshot)=>{
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey])
      delete playerElements[removedKey]
    })

    // PlayerInpitName
    playerNameInput.addEventListener('change', (e)=>{
      const newName = e.target.value || createName();
      playerNameInput.value = newName
      playerRef.update({
        name: newName
      })
    })

    // Coins
    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

      // Create the DOM Element
      const coinElementDiv = document.createElement("div");
      coinElementDiv.classList.add("Coin", "grid-cell");
      coinElementDiv.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElementDiv.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElement[key] = coinElementDiv;
      gameContainer.appendChild(coinElementDiv);
    })
    allCoinsRef.on("child_removed", (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y);
      gameContainer.removeChild( coinElement[keyToRemove] );
      delete coinElement[keyToRemove];
    })



    // Update playerColor
    playerColorButton.addEventListener('click', ()=>{
      let mySkinIndex = playerColors.indexOf(players[playerId].color)
      let nextColor = playerColors[mySkinIndex + 1] || playerColors[0]

      playerRef.update({
        color: nextColor
      })
    })
    placeCoin()
  }

  firebase.auth().onAuthStateChanged((user)=>{
    // console.log(user)
    if(user){
      playerId = user.uid
      playerRef = firebase.database().ref(`players/${playerId}`)

      const name = createName()
      playerNameInput.value = name

      const {x, y} = getRandomSafeSpot()

      playerRef.set({
        id: playerId,
        name,
        direction: 'right',
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0
      })

      // Remove player from firebase when disconnect
      playerRef.onDisconnect().remove()

      initGame()

      console.log('Your in')
    }else{
      console.log('Your out')
    }
  })

  firebase.auth().signInAnonymously().catch(err=>{
    let errorCode = err.code;
    let errorMessage = err.message;

    console.log(errorCode. errorMessage)
  })
})()