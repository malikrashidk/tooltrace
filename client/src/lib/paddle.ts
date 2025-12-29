declare global {
  interface Window {
    Paddle: any;
  }
}

let paddlePromise: Promise<any> | null = null;

export function loadPaddle() {
  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }

  if (paddlePromise) {
    return paddlePromise;
  }

  paddlePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      // Initialize Paddle
      // You should replace these with your actual environment keys
      // Ideally fetched from an endpoint or embedded in HTML if safe (client token is public)
      const PADDLE_CLIENT_TOKEN = "live_..."; // Needs to be provided by user env var, usually public
      // For now we assume the user will configure this later or we fetch it from an API
      // Since I can't put env vars in client code easily without Vite env vars

      // We will look for a global variable or assume Vite env
      const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
      const environment = import.meta.env.VITE_PADDLE_ENV || 'production';

      if (window.Paddle && token) {
        window.Paddle.Initialize({
          token: token,
          environment: environment,
          // eventCallback: function(data: any) {
          //   console.log(data);
          // }
        });
      }
      resolve(window.Paddle);
    };
    script.onerror = (e) => {
      reject(e);
      paddlePromise = null;
    };
    document.body.appendChild(script);
  });

  return paddlePromise;
}

export function openCheckout(priceId: string, email?: string, userId?: string) {
  loadPaddle().then(Paddle => {
    if (!Paddle) {
      console.error("Paddle not loaded");
      return;
    }

    Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: {
        email: email
      },
      customData: {
        userId: userId
      }
    });
  });
}
