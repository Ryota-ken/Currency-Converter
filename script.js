const API_BASE = 'https://api.frankfurter.app';
        
        const els = {
            amount: document.getElementById('amount'),
            from: document.getElementById('from'),
            to: document.getElementById('to'),
            swap: document.getElementById('swap'),
            form: document.getElementById('converter'),
            convertBtn: document.getElementById('convert'),
            result: document.getElementById('result'),
            resultSection: document.getElementById('result-section'),
            rate: document.getElementById('rate'),
            updated: document.getElementById('updated'),
            error: document.getElementById('error'),
            themeToggle: document.getElementById('themeToggle'),
            favoritePairs: document.getElementById('favoritePairs'),
            historyList: document.getElementById('historyList'),
            clearHistory: document.getElementById('clearHistory'),
            totalConversions: document.getElementById('totalConversions'),
            favoriteFrom: document.getElementById('favoriteFrom')
        };

        const store = {
            get key() { return 'cc_prefs_v2'; },
            get historyKey() { return 'cc_history_v2'; },
            get statsKey() { return 'cc_stats_v2'; },
            load() {
                try { return JSON.parse(localStorage.getItem(this.key)) || {}; }
                catch { return {}; }
            },
            save(prefs) {
                try { localStorage.setItem(this.key, JSON.stringify(prefs)); } catch {}
            },
            loadHistory() {
                try { return JSON.parse(localStorage.getItem(this.historyKey)) || []; }
                catch { return []; }
            },
            saveHistory(history) {
                try { localStorage.setItem(this.historyKey, JSON.stringify(history.slice(-10))); } catch {}
            },
            loadStats() {
                try { return JSON.parse(localStorage.getItem(this.statsKey)) || { conversions: 0, currencies: {} }; }
                catch { return { conversions: 0, currencies: {} }; }
            },
            saveStats(stats) {
                try { localStorage.setItem(this.statsKey, JSON.stringify(stats)); } catch {}
            }
        };

        let currencyMap = {};

        async function fetchCurrencies() {
            try {
                const res = await fetch(`${API_BASE}/currencies`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                return await res.json();
            } catch (error) {
                console.warn('Primary currency API failed, using fallback');
                // Fallback currency list
                return {
                    'USD': 'United States Dollar',
                    'EUR': 'Euro',
                    'JPY': 'Japanese Yen',
                    'GBP': 'British Pound Sterling',
                    'AUD': 'Australian Dollar',
                    'CAD': 'Canadian Dollar',
                    'CHF': 'Swiss Franc',
                    'CNY': 'Chinese Yuan',
                    'SEK': 'Swedish Krona',
                    'NZD': 'New Zealand Dollar',
                    'MXN': 'Mexican Peso',
                    'SGD': 'Singapore Dollar',
                    'HKD': 'Hong Kong Dollar',
                    'NOK': 'Norwegian Krone',
                    'KRW': 'South Korean Won',
                    'TRY': 'Turkish Lira',
                    'RUB': 'Russian Ruble',
                    'INR': 'Indian Rupee',
                    'BRL': 'Brazilian Real',
                    'ZAR': 'South African Rand',
                    'IDR': 'Indonesian Rupiah',
                    'MYR': 'Malaysian Ringgit',
                    'THB': 'Thai Baht',
                    'PHP': 'Philippine Peso',
                    'VND': 'Vietnamese Dong'
                };
            }
        }

        async function convert(amount, from, to) {
            if (from === to) {
                return { amount, rate: 1, date: new Date().toISOString().slice(0,10) };
            }
            
            // Try multiple API endpoints for better reliability
            const apiEndpoints = [
                {
                    url: `${API_BASE}/latest?from=${from}&to=${to}`,
                    parseResponse: (data) => ({
                        rate: data.rates[to],
                        date: data.date
                    })
                },
                {
                    url: `https://api.exchangerate-api.com/v4/latest/${from}`,
                    parseResponse: (data) => ({
                        rate: data.rates[to],
                        date: data.date
                    })
                }
            ];
            
            for (const api of apiEndpoints) {
                try {
                    console.log('Trying API:', api.url);
                    
                    const res = await fetch(api.url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        },
                    });
                    
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    
                    const data = await res.json();
                    console.log('API Response:', data);
                    
                    const parsed = api.parseResponse(data);
                    const exchangeRate = parsed.rate;
                    
                    if (!exchangeRate) {
                        throw new Error(`Exchange rate not available for ${from} to ${to}`);
                    }
                    
                    const convertedAmount = amount * exchangeRate;
                    
                    return { 
                        amount: convertedAmount, 
                        rate: exchangeRate, 
                        date: parsed.date || new Date().toISOString().slice(0,10)
                    };
                } catch (error) {
                    console.warn(`API ${api.url} failed:`, error.message);
                    continue; // Try next API
                }
            }
            
            // If all APIs fail, throw error
            throw new Error('All currency APIs are unavailable. Please check your internet connection and try again.');
        }

        function formatMoney(value, currency, locale = navigator.language) {
            try {
                return new Intl.NumberFormat(locale, { 
                    style: 'currency', 
                    currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4
                }).format(value);
            } catch {
                return `${value.toFixed(2)} ${currency}`;
            }
        }

        function setError(msg) {
            els.error.textContent = msg || '';
            els.error.style.display = msg ? 'block' : 'none';
        }

        function populateCurrencyOptions(map, defaults) {
            currencyMap = map;
            const entries = Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
            const opts = entries.map(([code, name]) => {
                const el = document.createElement('option');
                el.value = code;
                el.textContent = `${code} — ${name}`;
                return el;
            });
            els.from.replaceChildren(...opts.map(o => o.cloneNode(true)));
            els.to.replaceChildren(...opts.map(o => o.cloneNode(true)));

            els.from.value = defaults.from || 'USD';
            els.to.value = defaults.to || 'IDR';
        }

        function updateFavoritePairs() {
            const favorites = ['USD→IDR', 'EUR→IDR', 'JPY→IDR', 'SGD→IDR', 'AUD→IDR'];
            els.favoritePairs.innerHTML = '';
            
            favorites.forEach(pair => {
                const [from, to] = pair.split('→');
                const btn = document.createElement('button');
                btn.className = 'favorite-pair';
                btn.textContent = pair;
                btn.onclick = () => {
                    els.from.value = from;
                    els.to.value = to;
                    els.form.dispatchEvent(new Event('submit'));
                };
                els.favoritePairs.appendChild(btn);
            });
        }

        function addToHistory(amount, from, to, result) {
            const history = store.loadHistory();
            const entry = {
                timestamp: Date.now(),
                amount,
                from,
                to,
                result: result.amount,
                rate: result.rate
            };
            history.unshift(entry);
            store.saveHistory(history);
            updateHistoryDisplay();
        }

        function updateHistoryDisplay() {
            const history = store.loadHistory();
            els.historyList.innerHTML = '';
            
            if (history.length === 0) {
                els.historyList.innerHTML = '<div style="color: var(--muted); font-style: italic;">No conversions yet</div>';
                return;
            }

            history.forEach((entry, index) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <span>${formatMoney(entry.amount, entry.from)} → ${formatMoney(entry.result, entry.to)}</span>
                    <span style="color: var(--muted);">${new Date(entry.timestamp).toLocaleDateString()}</span>
                `;
                div.onclick = () => {
                    els.amount.value = entry.amount;
                    els.from.value = entry.from;
                    els.to.value = entry.to;
                    els.form.dispatchEvent(new Event('submit'));
                };
                div.style.cursor = 'pointer';
                els.historyList.appendChild(div);
            });
        }

        function updateStats(from) {
            const stats = store.loadStats();
            stats.conversions = (stats.conversions || 0) + 1;
            stats.currencies = stats.currencies || {};
            stats.currencies[from] = (stats.currencies[from] || 0) + 1;
            
            store.saveStats(stats);
            
            els.totalConversions.textContent = stats.conversions;
            
            const mostUsed = Object.entries(stats.currencies)
                .sort(([,a], [,b]) => b - a)[0];
            els.favoriteFrom.textContent = mostUsed ? mostUsed[0] : '-';
        }

        function toggleTheme() {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            els.themeToggle.textContent = isLight ? '☀️' : '🌙';
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        }

        async function init() {
            setError('');
            els.result.textContent = '';
            els.rate.textContent = '';
            els.updated.textContent = '';

            // Load theme
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
                els.themeToggle.textContent = '☀️';
            }

            const prefs = store.load();
            const stats = store.loadStats();
            
            els.totalConversions.textContent = stats.conversions || 0;
            const mostUsed = Object.entries(stats.currencies || {})
                .sort(([,a], [,b]) => b - a)[0];
            els.favoriteFrom.textContent = mostUsed ? mostUsed[0] : '-';

            try {
                const map = await fetchCurrencies();
                populateCurrencyOptions(map, prefs);
            } catch (e) {
                setError('Could not load currency list. Check your connection and refresh.');
                populateCurrencyOptions({
                    USD: 'United States Dollar',
                    EUR: 'Euro',
                    JPY: 'Japanese Yen',
                    GBP: 'British Pound',
                    AUD: 'Australian Dollar',
                    CAD: 'Canadian Dollar',
                    INR: 'Indian Rupee',
                    IDR: 'Indonesian Rupiah',
                    SGD: 'Singapore Dollar',
                    MYR: 'Malaysian Ringgit'
                }, prefs);
            }

            updateFavoritePairs();
            updateHistoryDisplay();
            
            // Auto-run once with current values
            handleConvert(new Event('submit'));
        }

        async function handleConvert(e) {
            e.preventDefault();
            setError('');
            const amount = parseFloat(els.amount.value || '0');
            const from = els.from.value;
            const to = els.to.value;

            if (isNaN(amount) || amount < 0) {
                setError('Enter a valid amount (0 or more).');
                return;
            }

            if (!from || !to) {
                setError('Please select both currencies.');
                return;
            }

            // Check if online
            if (!navigator.onLine) {
                setError('You appear to be offline. Please check your internet connection.');
                return;
            }

            els.convertBtn.disabled = true;
            els.convertBtn.innerHTML = '<span class="loading"></span> Converting...';

            let retryCount = 0;
            const maxRetries = 3;

            const attemptConversion = async () => {
                try {
                    console.log(`Converting ${amount} ${from} to ${to} (attempt ${retryCount + 1})`);
                    const result = await convert(amount, from, to);
                    console.log('Conversion successful:', result);
                    
                    els.result.textContent = `${formatMoney(amount, from)} → ${formatMoney(result.amount, to)}`;
                    els.rate.textContent = `Rate: 1 ${from} = ${formatMoney(result.rate, to)}`;
                    els.updated.textContent = `Last updated: ${result.date}`;
                    
                    els.resultSection.classList.remove('hidden');
                    
                    store.save({ from, to });
                    addToHistory(amount, from, to, result);
                    updateStats(from);
                } catch (error) {
                    console.error('Conversion error:', error);
                    retryCount++;
                    
                    if (retryCount < maxRetries) {
                        console.log(`Retrying... (${retryCount}/${maxRetries})`);
                        els.convertBtn.innerHTML = `<span class="loading"></span> Retrying... (${retryCount}/${maxRetries})`;
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                        return attemptConversion();
                    } else {
                        throw error;
                    }
                }
            };

            try {
                await attemptConversion();
            } catch (error) {
                let errorMessage = 'Conversion failed. ';
                
                if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
                    errorMessage += 'Please check your internet connection and try again.';
                } else if (error.message.includes('unavailable')) {
                    errorMessage += 'Currency exchange services are temporarily unavailable.';
                } else {
                    errorMessage += error.message;
                }
                
                setError(errorMessage);
                els.resultSection.classList.add('hidden');
            } finally {
                els.convertBtn.disabled = false;
                els.convertBtn.textContent = 'Convert';
            }
        }

        function handleSwap() {
            const temp = els.from.value;
            els.from.value = els.to.value;
            els.to.value = temp;
            els.form.dispatchEvent(new Event('submit'));
        }

        // Event listeners
        els.form.addEventListener('submit', handleConvert);
        els.swap.addEventListener('click', handleSwap);
        els.themeToggle.addEventListener('click', toggleTheme);
        els.clearHistory.addEventListener('click', () => {
            store.saveHistory([]);
            updateHistoryDisplay();
        });

        // Live convert on change
        els.amount.addEventListener('input', () => els.form.dispatchEvent(new Event('submit')));
        els.from.addEventListener('change', () => els.form.dispatchEvent(new Event('submit')));
        els.to.addEventListener('change', () => els.form.dispatchEvent(new Event('submit')));

        // Initialize app
        init();