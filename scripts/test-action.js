const { config } = require('dotenv');
config({ path: '.env.local' });

// Precisamos simular Next.js cache para carregar as actions fora do Next, mas uma vez que actions dependem do ambiente next, talvez seja melhor fazer a chamada via require normal.
// Para evitar problemas de module import, faremos via API fetch se existisse, mas não existe, é server action.
