import { 
  SunflowerSessionData
} from '../types/extension';

class NetworkInterceptor {

  constructor() {
    console.log('🚀🚀🚀 NetworkInterceptor constructor appelé 🚀🚀🚀');
    console.log('📍 URL actuelle:', window.location.href);
    console.log('📍 Domain:', window.location.hostname);
    this.interceptFetch();
    this.interceptXMLHttpRequest();
    console.log('✅✅✅ NetworkInterceptor initialisé avec succès ✅✅✅');
    
    // Test de base pour vérifier que le script fonctionne
    console.log('🔍 Test de fetch original:', typeof window.fetch);
    console.log('🔍 Test de chrome.runtime:', typeof chrome?.runtime);
  }

  private interceptFetch(): void {
    console.log('🔧 Début de interceptFetch()');
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Log TOUTES les requêtes pour debug
      if (url.includes('sunflower-land.com')) {
        console.log('🌻 Requête Sunflower détectée:', {
          url,
          method: init?.method || 'GET',
          isAPI: url.includes('api.sunflower-land.com')
        });
      }
      
      // Capturer POST /session ET POST /autosave
      const isSessionPost = url.includes('api.sunflower-land.com/session') && (init?.method === 'POST');
      const isAutosavePost = url.includes('api.sunflower-land.com/autosave') && (init?.method === 'POST');
      const shouldCapture = isSessionPost || isAutosavePost;
      
      if (shouldCapture) {
        if (isSessionPost) {
          console.log('🟢 POST /session DÉTECTÉ:', url);
        } else if (isAutosavePost) {
          console.log('🔄 POST /autosave DÉTECTÉ:', url);
          // Extraire l'analyticsId pour les logs
          const match = url.match(/\/autosave\/(\d+)/);
          if (match) {
            console.log('🎯 analyticsId extrait:', match[1]);
          }
        }
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
        // Sauvegarder POST /session ET POST /autosave
        if (shouldCapture) {
          // Déterminer le type et extraire l'analyticsId si nécessaire
          const type = isSessionPost ? 'session' : 'autosave';
          let analyticsId: string | undefined = undefined;
          
          if (isAutosavePost) {
            // Extraire l'analyticsId depuis l'URL (/autosave/147896)
            const match = url.match(/\/autosave\/(\d+)/);
            if (match) {
              analyticsId = match[1];
            }
          }
          
          const sessionData: SunflowerSessionData = {
            timestamp: startTime,
            method: init?.method || 'GET',
            url: url,
            requestBody: requestBody,
            responseBody: responseBody,
            responseHeaders: this.extractHeaders(response.headers),
            statusCode: response.status,
            type: type,
            ...(analyticsId && { analyticsId })
          };

          // Envoyer les données au background script
          this.sendNetworkData(sessionData);
        }

        return response;
      } catch (error) {
        // En cas d'erreur, sauvegarder si c'est POST /session OU POST /autosave
        if (shouldCapture) {
          // Déterminer le type et extraire l'analyticsId si nécessaire
          const type = url.includes('/session') ? 'session' : 'autosave';
          let analyticsId: string | undefined = undefined;
          
          if (url.includes('/autosave')) {
            // Extraire l'analyticsId depuis l'URL (/autosave/147896)
            const match = url.match(/\/autosave\/(\d+)/);
            if (match) {
              analyticsId = match[1];
            }
          }
          
          const sessionData: SunflowerSessionData = {
            timestamp: startTime,
            method: init?.method || 'GET',
            url: url,
            requestBody: requestBody,
            responseBody: { error: (error as Error).message },
            responseHeaders: {},
            statusCode: 0,
            type: type,
            ...(analyticsId && { analyticsId })
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
            // Capturer POST /session ET POST /autosave
            const isSessionPost = url.includes('api.sunflower-land.com/session') && method === 'POST';
            const isAutosavePost = url.includes('api.sunflower-land.com/autosave') && method === 'POST';
            const shouldCapture = isSessionPost || isAutosavePost;
            
            if (shouldCapture) {
              if (isSessionPost) {
                console.log('🟢 POST /session DÉTECTÉ (XHR):', url);
              } else if (isAutosavePost) {
                console.log('🔄 POST /autosave DÉTECTÉ (XHR):', url);
                // Extraire l'analyticsId pour les logs
                const match = url.match(/\/autosave\/(\d+)/);
                if (match) {
                  console.log('🎯 analyticsId extrait (XHR):', match[1]);
                }
              }
            }
            
            let responseBody: any = undefined;
            
            try {
              if (xhr.responseText) {
                responseBody = JSON.parse(xhr.responseText);
              }
            } catch (error) {
              // Ignorer les erreurs de parsing
            }

            // Sauvegarder POST /session ET POST /autosave
            if (shouldCapture) {
              // Déterminer le type et extraire l'analyticsId si nécessaire
              const type = isSessionPost ? 'session' : 'autosave';
              let analyticsId: string | undefined = undefined;
              
              if (isAutosavePost) {
                // Extraire l'analyticsId depuis l'URL (/autosave/147896)
                const match = url.match(/\/autosave\/(\d+)/);
                if (match) {
                  analyticsId = match[1];
                }
              }
              
              const sessionData: SunflowerSessionData = {
                timestamp: startTime,
                method: method,
                url: url,
                requestBody: requestBody,
                responseBody: responseBody,
                responseHeaders: self.parseResponseHeaders(xhr.getAllResponseHeaders()),
                statusCode: xhr.status,
                type: type,
                ...(analyticsId && { analyticsId })
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
    
    const logPrefix = data.type === 'autosave' ? '🔄' : '🟢';
    console.log(`${logPrefix} Données envoyées via postMessage:`, {
      type: data.type,
      method: data.method,
      url: data.url,
      analyticsId: data.analyticsId,
      hasResponseBody: !!data.responseBody
    });
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