// Função do Vercel: GET /api/alimentos?q=pasta de amendoim → produtos brasileiros da Open Food Facts (por 100 g).
import { responderBusca } from "./_off.js";

export function GET(request) {
  return responderBusca(request.url);
}
