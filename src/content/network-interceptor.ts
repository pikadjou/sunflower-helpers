import { 
  SunflowerSessionData
} from '../types/extension';

class NetworkInterceptor {

  constructor() {
    console.log('🚀 NetworkInterceptor constructor appelé');
    this.interceptFetch();
    this.interceptXMLHttpRequest();
    console.log('🚀 NetworkInterceptor initialisé avec succès');
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Ne capturer QUE POST /session
      const isSessionPost = url.includes('api.sunflower-land.com/session') && (init?.method === 'POST');
      
      if (isSessionPost) {
        console.log('🟢 POST /session DÉTECTÉ:', url);
      }

      const startTime = Date.now();
      let requestBody: any = undefined;

      // Capturer le corps de la requête si présent
      if (init?.body) {
        try {
          if (typeof init.body === 'string') {
            requestBody = JSON.parse(init.body);
          } else if (init.body instanceof FormData) {
            requestBody = Object.fromEntries(init.body as any);
          }
        } catch (error) {
          // Ignorer les erreurs de parsing
        }
      }

      try {
        const response = await originalFetch(input, init);
        
        // Créer une copie de la réponse pour pouvoir lire le body
        const responseClone = response.clone();
        let responseBody: any = undefined;

        try {
          const responseText = await responseClone.text();
          if (responseText) {
            responseBody = JSON.parse(responseText);
          }
        } catch (error) {
          // Ignorer les erreurs de parsing
        }

        // Créer l'objet de données de session
        // Ne sauvegarder QUE POST /session
        if (isSessionPost) {
          const sessionData: SunflowerSessionData = {
            timestamp: startTime,
            method: init?.method || 'GET',
            url: url,
            requestBody: requestBody,
            responseBody: responseBody,
            responseHeaders: this.extractHeaders(response.headers),
            statusCode: response.status
          };

          // Envoyer les données au background script
          this.sendNetworkData(sessionData);
        }

        return response;
      } catch (error) {
        // En cas d'erreur, sauvegarder seulement si c'est POST /session
        if (isSessionPost) {
          const sessionData: SunflowerSessionData = {
            timestamp: startTime,
            method: init?.method || 'GET',
            url: url,
            requestBody: requestBody,
            responseBody: { error: (error as Error).message },
            responseHeaders: {},
            statusCode: 0
          };

          this.sendNetworkData(sessionData);
        }
        throw error;
      }
    };
  }

  private interceptXMLHttpRequest(): void {
    const originalXHR = window.XMLHttpRequest;
    const self = this;

    (window as any).XMLHttpRequest = function() {
      const xhr = new originalXHR();
      let method = '';
      let url = '';
      let requestBody: any = undefined;
      const startTime = Date.now();

      // Intercepter open
      const originalOpen = xhr.open;
      xhr.open = function(m: string, u: string | URL, _async: boolean = true, _username?: string | null, _password?: string | null) {
        method = m;
        url = typeof u === 'string' ? u : u.href;
        return originalOpen.apply(this, arguments as any);
      };

      // Intercepter send
      const originalSend = xhr.send;
      xhr.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
        // Capturer le corps de la requête
        if (body) {
          try {
            if (typeof body === 'string') {
              requestBody = JSON.parse(body);
            } else if (body instanceof FormData) {
              requestBody = Object.fromEntries(body as any);
            }
          } catch (error) {
            // Ignorer les erreurs de parsing
          }
        }

        // Intercepter la réponse
        const originalOnReadyStateChange = xhr.onreadystatechange;
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            // Ne capturer QUE POST /session
            const isSessionPost = url.includes('api.sunflower-land.com/session') && method === 'POST';
            
            if (isSessionPost) {
              console.log('🟢 POST /session DÉTECTÉ (XHR):', url);
            }
            
            let responseBody: any = undefined;
            
            try {
              if (xhr.responseText) {
                responseBody = JSON.parse(xhr.responseText);
              }
            } catch (error) {
              // Ignorer les erreurs de parsing
            }

            // Ne sauvegarder QUE POST /session
            if (isSessionPost) {
              const sessionData: SunflowerSessionData = {
                timestamp: startTime,
                method: method,
                url: url,
                requestBody: requestBody,
                responseBody: responseBody,
                responseHeaders: self.parseResponseHeaders(xhr.getAllResponseHeaders()),
                statusCode: xhr.status
              };

              self.sendNetworkData(sessionData);
            }
          }

          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, new Event('readystatechange'));
          }
        };

        return originalSend.apply(this, [body]);
      };

      return xhr;
    };
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    return headerObj;
  }

  private parseResponseHeaders(headerString: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (headerString) {
      headerString.split('\r\n').forEach(line => {
        const [key, value] = line.split(': ');
        if (key && value) {
          headers[key] = value;
        }
      });
    }
    return headers;
  }

  private sendNetworkData(data: SunflowerSessionData): void {
    // Dans le monde MAIN, utiliser postMessage pour communiquer
    window.postMessage({
      type: 'SUNFLOWER_NETWORK_DATA',
      data: data
    }, '*');
    
    console.log('Données réseau envoyées via postMessage:', data.method, data.url);
  }
}

// Log de démarrage du script
console.log('🚀 Script network-interceptor.js chargé!', window.location.href);
console.log('🚀 Document ready state:', document.readyState);

// Initialiser l'intercepteur réseau dès que possible
if (document.readyState === 'loading') {
  console.log('🚀 En attente de DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation intercepteur réseau (DOMContentLoaded)');
    new NetworkInterceptor();
  });
} else {
  console.log('🚀 Initialisation intercepteur réseau (immédiate)');
  new NetworkInterceptor();
}