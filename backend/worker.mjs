const topics = new Set([
  'Общий вопрос', 'Бухгалтерский учёт', 'Отчётность', 'Налоговая консультация',
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== env.SITE_ORIGIN) return new Response(null, {status: 403});
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
    };
    const reply = status => new Response(null, {status, headers});
    if (new URL(request.url).pathname !== '/booking') return reply(404);
    if (request.method === 'OPTIONS') return reply(204);
    if (request.method !== 'POST') return reply(405);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return reply(503);
    const {success} = await env.BOOKING_LIMIT.limit({
      key: request.headers.get('CF-Connecting-IP') || 'unknown',
    });
    if (!success) return reply(429);

    let data;
    try {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      let size = 0;
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return reply(413);
        }
        raw += decoder.decode(value, {stream: true});
      }
      data = JSON.parse(raw + decoder.decode());
    } catch {
      return reply(400);
    }

    const field = key => typeof data?.[key] === 'string' ? data[key].trim() : '';
    const name = field('name');
    const contact = field('contact');
    const topic = field('topic');
    const time = field('time');
    if (!name || name.length > 80 || !contact || contact.length > 120 ||
        !topics.has(topic) || time.length > 100) return reply(400);

    const message = [
      'Новая заявка на консультацию · Бухгалтер Плюс',
      `Имя: ${name}`, `Контакт: ${contact}`, `Тема: ${topic}`,
      time && `Удобное время: ${time}`,
    ].filter(Boolean).join('\n');

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: message,
            link_preview_options: {is_disabled: true},
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      return reply(response.ok && (await response.json()).ok ? 204 : 502);
    } catch {
      return reply(502);
    }
  },
};
