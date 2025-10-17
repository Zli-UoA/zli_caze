class Message {
  value: string;
  x: number;
  y: number;
  width: number;
  time: number;
  lineWidth: number;

  constructor(
    value: string,
    x: number,
    y: number,
    width: number,
    time: number,
    lineWidth: number,
  ) {
    this.value = value;
    this.x = x;
    this.y = y;
    this.width = width;
    this.time = time;
    this.lineWidth = lineWidth;
  }

  isFinished() {
    return this.x < 0 - this.width;
  }

  isStartPos(canvasWidth: number) {
    if (this.x + this.width >= canvasWidth) return true;

    return false;
  }

  update(deltaTime: number, canvasWidth: number) {
    this.x -= ((this.width + canvasWidth) / this.time) * deltaTime;

    if (this.isFinished()) return;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const canvasHeight = ctx.canvas.height;
    const y = this.y >= canvasHeight ? this.y - canvasHeight : this.y;

    ctx.save();
    ctx.strokeStyle = "white";
    ctx.lineWidth = this.lineWidth;
    ctx.strokeText(this.value, this.x, y);
    ctx.restore();

    ctx.fillText(this.value, this.x, y);
  }
}

class AnimationController {
  id: number | undefined;
  prev: number | undefined;
  update: (deltaTime: number) => void;

  constructor(update: (deltaTime: number) => void) {
    this.update = update;
  }

  private tick(now: number) {
    this.id = requestAnimationFrame((time) => this.tick(time));

    if (this.prev == null) {
      this.prev = now;
      return;
    }

    const deltaTime = (now - this.prev) * 0.001;

    this.update(deltaTime);

    this.prev = now;
  }

  start() {
    this.id = requestAnimationFrame((time) => this.tick(time));
  }

  stop() {
    if (this.id == null) return;
    cancelAnimationFrame(this.id);
  }
}

type Config = {
  fontSize: number;
  lineWidth: number;
  backgroundColor: string;
  speed: number /* 何秒で通過するか */;
};

const defaultConfig: Config = {
  fontSize: 120,
  lineWidth: 15,
  backgroundColor: "green",
  speed: 8,
};

class Viewer {
  ctx: CanvasRenderingContext2D;
  messages: Message[];
  animationController: AnimationController;
  config: Config;

  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<Config> = defaultConfig,
  ) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    this.ctx = canvas.getContext("2d")!;
    this.messages = [];
    this.config = { ...defaultConfig, ...config };

    this.ctx.font = `bold ${this.config.fontSize}px sans-serif`;

    this.animationController = new AnimationController((deltaTime) =>
      this.update(deltaTime),
    );
  }

  private update(deltaTime: number) {
    this.ctx.save();
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.restore();

    this.messages = this.messages.filter((message) => !message.isFinished());

    for (const message of this.messages) {
      message.update(deltaTime, this.ctx.canvas.width);
    }

    for (const message of this.messages) {
      message.draw(this.ctx);
    }
  }

  private calcNextY() {
    let y = this.config.fontSize;

    const messages = [...this.messages]
      .filter((message) => message.isStartPos(this.ctx.canvas.width))
      .sort((a, b) => a.y - b.y);

    for (const message of messages) {
      if (message.y !== y) break;
      y += this.config.fontSize;
    }

    return y;
  }

  addMessage(message: string) {
    const messageWidth = this.ctx.measureText(message).width;

    this.messages.push(
      new Message(
        message,
        this.ctx.canvas.width + messageWidth / 2,
        this.calcNextY(),
        messageWidth,
        this.config.speed,
        this.config.lineWidth,
      ),
    );
  }

  start() {
    this.animationController.start();
  }

  stop() {
    this.animationController.stop();
  }
}

export { Viewer };
export type { Config };
