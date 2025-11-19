export class UIManager {
    private scoreElement: HTMLElement;
    private highScoreElement: HTMLElement;
    private gameOverElement: HTMLElement;
    private finalScoreElement: HTMLElement;
    private instructionsElement: HTMLElement;
    private pauseMenuElement: HTMLElement;
    private restartBtn: HTMLButtonElement;
    private startBtn: HTMLButtonElement;

    constructor() {
        this.scoreElement = document.getElementById('score')!;
        this.highScoreElement = document.getElementById('highScore')!;
        this.gameOverElement = document.getElementById('gameOver')!;
        this.finalScoreElement = document.getElementById('finalScore')!;
        this.instructionsElement = document.getElementById('instructions')!;
        this.pauseMenuElement = document.getElementById('pauseMenu')!;
        this.restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
        this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    }

    public updateScore(score: number): void {
        this.scoreElement.textContent = `Score: ${Math.floor(score)}`;
    }

    public updateHighScore(highScore: number): void {
        this.highScoreElement.textContent = `High Score: ${highScore}`;
    }

    public showGameOver(score: number): void {
        this.finalScoreElement.textContent = `Final Score: ${Math.floor(score)}`;
        this.gameOverElement.classList.remove('hidden');
    }

    public hideGameOver(): void {
        this.gameOverElement.classList.add('hidden');
    }

    public showInstructions(): void {
        this.instructionsElement.classList.remove('hidden');
    }

    public hideInstructions(): void {
        this.instructionsElement.classList.add('hidden');
    }

    public showPauseMenu(): void {
        this.pauseMenuElement.classList.remove('hidden');
    }

    public hidePauseMenu(): void {
        this.pauseMenuElement.classList.add('hidden');
    }

    public bindButtons(onStart: () => void, onRestart: () => void): void {
        this.startBtn.addEventListener('click', onStart);
        this.restartBtn.addEventListener('click', onRestart);
    }
}
