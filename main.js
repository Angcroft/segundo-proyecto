//  Variables para contenedores que se encuentran en el sitio
let gameCanvas;
let videoCanvas;
let video;

//  Variables que sirven para la sección del juego
let player;
let playerX, playerY; // Posición del jugador
let bottleX, bottleY; // Posición del 'bottle' detectado
let maxSpeed = 5;
let walls = [];
let objects = [];
let spawnRate = 2000; // Intervalo de generación de enemigos en milisegundos
let lastSpawnTime = 0;

//  Variables que sirven para el módulo de detector de objetos con ML5.js
let detector;
let detections = [];
let objetosRegistrados = []; //  Array para registrar todos los elementos en cámara

function setup() {
    // Crear lienzo para el juego
    const gameCanvas = createCanvas(400, 400);
    gameCanvas.parent('game-container');

    video = document.getElementById('video')

    // Aparición visual del vídeo grabado por la cámara
    video = createCapture(VIDEO, videoReady);
    video.size(640, 480);
    video.hide();


    //  Spawn del jugador
    player = new Player(width / 2, height / 2);
    player.bulletSpeed = 5;
    player.angle = 0;

    // Crear paredes alrededor del lienzo
    walls.push(new Wall(0, 0, width, 10, true)); // Pared superior
    walls.push(new Wall(0, height - 10, width, 10, true)); // Pared inferior
    walls.push(new Wall(0, 0, 10, height, true)); // Pared izquierda
    walls.push(new Wall(width - 10, 0, 10, height, true)); // Pared derecha
}

function videoReady()
{
    detector = ml5.objectDetector('cocossd', modelReady);
}

//  Error catch
function gotDetections(error, results)
{
    if(error)
    {
        console.error(error);
    }
    detections = results;
    detector.detect(video, gotDetections);
}

function modelReady()
{
    detector.detect(video, gotDetections);
}

function spawnEnemy() 
{
    // Genera un enemigo y agrega al arreglo de objetos
    const randomWall = random(walls);
    let enemy;

    // Probabilidades de tipo de enemigo, del más probable al menos, limitados en la generación por las paredes
    const rand = random();
    if (rand < 0.6) 
    {
        enemy = new WeakEnemy(random(randomWall.x + 10, randomWall.x + randomWall.width - 10), random(randomWall.y + 10, randomWall.y + randomWall.height - 10), 10);
    } else if (rand < 0.9) 
    {
        enemy = new ChasingEnemy(random(randomWall.x + 10, randomWall.x + randomWall.width - 10), random(randomWall.y + 10, randomWall.y + randomWall.height - 10), 15);
    } else 
    {
        enemy = new FleeingEnemy(random(randomWall.x + 10, randomWall.x + randomWall.width - 10), random(randomWall.y + 10, randomWall.y + randomWall.height - 10), 20);
    }

    //  ¡Y aparece el enemigo!
    objects.push(enemy);
}

function checkBulletCollision(bullet) 
{
    // Verificar colisiones con enemigos u otros objetos aquí
    for (let i = objects.length - 1; i >= 0; i--) 
    {
        let obj = objects[i];
        if ((obj instanceof Enemy && obj.collidesWith(bullet)) || (obj.label === 'cell phone' && obj.collidesWith(bullet))) 
        {
            // La bala es eliminada una vez true
            return true;
        }
    }

    // La bala desaparece de la pantalla
    if (bullet.y < 0 || bullet.y > height || bullet.x < 0 || bullet.x > width) 
    {
        return true;
    }

    return false;
}

function checkPlayerCollision(player) 
{
    // Se verifican las colisiones entre el jugador con los enemigos
    for (let i = objects.length - 1; i >= 0; i--) 
    {
        let obj = objects[i];
        if (obj instanceof Enemy && obj.collidesWithPlayer(player)) 
        {
            if (!player.invincible) 
            {
                const damage = obj.getDamage();
                player.takeDamage(damage);
            }
        }
    }
}

function restartGame() 
{
    const gameOverContainer = document.getElementById('game-over-container');
    gameOverContainer.style.display = 'none';
    document.getElementById('health-container').classList.remove('hidden');

    // Resetear jugador
    player.reset();

    // Eliminar enemigos existentes
    objects = [];
    lastSpawnTime = 0; // Reiniciar el tiempo de generación de enemigos
}

function showGameOverScreen() 
{
    const gameOverContainer = document.getElementById('game-over-container');
    gameOverContainer.style.display = 'block';

    // Reiniciar el juego cuando se haga clic en el botón "Restart"
    document.getElementById('restart-button').addEventListener('click', function() 
    {
        resetGame();
    });
}

function draw() 
{
    image(video, 0, 0);

    for (let i = 0; i < detections.length; i++) 
    {
        const object = detections[i];
        stroke(0, 255, 0);
        strokeWeight(4);
        noFill();
        rect(object.x, object.y, object.width, object.height);
        noStroke();
        fill(255);
        textSize(24);
        text(object.label, object.x + 10, object.y + 24);

        //  Esta condicional se asegura que los objetos que aparecen
        //  durante el registro no vuelvan a aparecer,
        //  ya que si el objeto no se encuentra en la lista,
        //  se agrega por medio del push
        if(!esObjetoRegistrado(object))
        {
            objetosRegistrados.push(object);
            agregarListaDeteccion(object);
        }

    }

    // Verificar si se detecta un 'bottle'
    const bottleDetection = detections.find(object => object.label === 'bottle');

    // Se empieza el movimiento una vez detectado el 'bottle'
    if (bottleDetection) 
    {
        // Obtener las coordenadas del 'bottle' detectado
        const bottleCoordinates = getBottleCoordinates();

        // Calcula el ángulo entre el jugador y el 'bottle'
        const angle = atan2(bottleCoordinates.y - player.y, bottleCoordinates.x - player.x);

        // Calcula la distancia entre el jugador y el 'bottle'
        const distance = dist(player.x, player.y, bottleCoordinates.x, bottleCoordinates.y);

        // Ajustar la velocidad del jugador para moverlo hacia el 'bottle'
        const speed = 3;
        const vx = cos(angle) * speed;
        const vy = sin(angle) * speed;

        // Mover al jugador automáticamente hacia el 'bottle'
        player.x += vx;
        player.y += vy;

        // El jugador se detiene una vez se encuentra cerca del 'bottle'
        const stoppingDistance = 10;
        if (distance < stoppingDistance) {
            // Detener el movimiento
            player.movementDirection.set(0, 0);
        }
    } else 
    {
        // No hay 'bottle' en la pantalla, se detiene el movimiento
        player.movementDirection.set(0, 0);
    }


    if (player) 
    {
        // Se dibujan y mueven las balas
        for (let i = player.bullets.length - 1; i >= 0; i--) {
           let bullet = player.bullets[i];
           bullet.move();
           bullet.show();
  
           // Verificar colisiones con paredes u otros objetos aquí
           if (checkBulletCollision(bullet)) 
           {
              player.bullets.splice(i, 1);
           }
        }
  
        // Obtener las coordenadas del 'cell phone' detectado
        const cellPhoneCoordinates = getCellPhoneCoordinates();

        // Se hace el cooldown en milisegundos, también se pone la opción de si se usa la barra espaciadora o el celular detectado
        const currentTime = millis();
        const shootingCooldown = isCellPhoneDetected() ? player.shootCooldown / 2 : player.shootCooldown;
  
        if ((keyIsDown(32) || isCellPhoneDetected()) && currentTime - player.lastShotTime > shootingCooldown) 
        {
           // Movimiento y dirección de las balas dependientes de la dirección del Mouse en la pantalla.
           let shootAngle;
           if (isCellPhoneDetected()) 
           {
              // Calcular el ángulo basado en las coordenadas del 'cell phone' detectado
              shootAngle = atan2(cellPhoneCoordinates.y - player.y, cellPhoneCoordinates.x - player.x);
           } else 
           {
              // Calcular el ángulo basado en la dirección del Mouse en la pantalla
              shootAngle = atan2(mouseY - player.y, mouseX - player.x);
           }
           const bulletX = player.x + player.size / 2 * cos(shootAngle);
           const bulletY = player.y + player.size / 2 * sin(shootAngle);
  
           player.bullets.push(new Bullet(bulletX, bulletY, player.bulletSpeed, shootAngle));
           player.lastShotTime = currentTime;
        }
     }


    // Se muestran las paredes
    for (let wall of walls) 
    {
        wall.show();
    }

    // Se muestra y actualiza el jugador en sus distintos tipos de funciones.
    if (player && player.isAlive) 
    {    
    player.show();
    player.move();
    player.shoot();
    player.showHealth();
    player.draw();
    }

    if (player.health <= 0) 
    {
        // Mostrar el mensaje de Game Over y el botón de reinicio
        showGameOverScreen();
    }

    // Verifica el tiempo transcurrido para la generación de enemigos
    const currentTime = millis();
    if (currentTime - lastSpawnTime > spawnRate) {
        spawnEnemy();
        lastSpawnTime = currentTime;
    }

    // Mostrar y actualiza enemigos
    for (let i = objects.length - 1; i >= 0; i--) {
        let obj = objects[i];
        obj.show();
    
        // Verifica si el objeto tiene el método update antes de llamarlo
        if (obj instanceof Enemy) 
        {
            obj.update(player);
    
            // Verifica si el enemigo tiene cero de salud y elimínalo
            if (obj.health <= 0) 
            {
                console.log("Enemy eliminated!");
                objects.splice(i, 1);
            }
        } else if (obj instanceof Bullet) 
        {
            // Verificar colisiones con enemigos u otros objetos aquí
            if (checkBulletCollision(obj)) {
                console.log("Bullet hit!");
                objects.splice(i, 1);
            }
        }
    }

    // Verificar colisiones del jugador
    checkPlayerCollision(player);

    if (player.health <= 0) 
    {
        player.health = 0; // Asegura que la salud sea 0
        document.getElementById('health-container').classList.add('hidden');
        showGameOverScreen(); // Llama a la función que muestra el mensaje de Game Over
    }

//  Esta función se usa para verificar que el objeto no se
//  encuentre en el array
function esObjetoRegistrado(object)
{
    const objetoExiste = objetosRegistrados.find((item) => item.label === object.label);
    return !!objetoExiste;
}

//  Esta función agarra la id del div que se encuentra en le index.html, agarra
//  el nombre del objeto agregado en el array y es implementado en la lista de HTML
function agregarListaDeteccion(object)
{
    const listaDeteccion = document.getElementById('detection-list');
    const listItem = document.createElement('li')
    listItem.innerText = `${object.label}`;
    listaDeteccion.appendChild(listItem);
}

function isCellPhoneDetected() 
{
    for (let i = 0; i < detections.length; i++) 
    {
       const object = detections[i];
       if (object.label === 'cell phone') 
       {
          return true;
       }
    }
    return false;
 }

 function getCellPhoneCoordinates() 
 {
    for (let i = 0; i < detections.length; i++) {
       const object = detections[i];
       if (object.label === 'cell phone') 
       {
          return { x: object.x, y: object.y 
        };
       }
    }
    // Si no se detecta un 'cell phone', devuelve un valor predeterminado
    return { x: 0, y: 0 };
 }

// Nueva función para obtener las coordenadas del 'bottle' detectado
function getBottleCoordinates() 
{
    for (let i = 0; i < detections.length; i++) {
       const object = detections[i];
       if (object.label === 'bottle') {
          return { x: object.x, y: object.y };
       }
    }
    // Si no se detecta un 'bottle', devuelve un valor predeterminado
    return { x: 0, y: 0 };
 }


 function isBottleDetected() 
 {
    for (let i = 0; i < detections.length; i++) {
       const object = detections[i];
       if (object.label === 'bottle') {
          return true;
       }
    }
    return false;
 }
}
