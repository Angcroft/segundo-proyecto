class Wall {
    constructor(x, y, width, height, hasDoor = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.hasDoor = hasDoor;
        this.doorWidth = 20;
        this.doorHeight = 5;
    }

    show() {
        fill(150, 75, 0);
        rect(this.x, this.y, this.width, this.height);

        if (this.hasDoor) {
            fill(0);
            if (this.width > this.height) {
                rect(this.x + (this.width - this.doorWidth) / 2, this.y, this.doorWidth, this.doorHeight);
            } else {
                rect(this.x, this.y + (this.height - this.doorHeight) / 2, this.doorWidth, this.doorHeight);
            }
        }
    }

    generateEnemy() {
        // Generar un número aleatorio para determinar el tipo de enemigo
        const randomValue = random();

        if (randomValue < 0.2) {
            // 20% de probabilidad de generar un FleeingEnemy
            return new FleeingEnemy(20);
        } else if (randomValue < 0.5) {
            // 30% de probabilidad de generar un ChasingEnemy
            return new ChasingEnemy(20);
        } else {
            // 50% de probabilidad de generar un Enemy
            return new Enemy(20);
        }
    }
}
