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
      const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
      const environment = import.meta.env.VITE_PADDLE_ENV || 'production';

      if (window.Paddle && token) {
        if (environment === 'sandbox') {
          window.Paddle.Environment.set('sandbox');
        }

        window.Paddle.Initialize({
          token: token,
          // eventCallback: function(data: any) {
          //   console.log(data);
          // }
        });
        resolve(window.Paddle);
      } else {
        // If no token or paddle failed to load but triggered onload
        resolve(null);
      }
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
