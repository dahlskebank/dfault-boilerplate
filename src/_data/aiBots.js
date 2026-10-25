// AI crawler registry — read by src/robots.njk as {{ aiBots.xxx }}.
//
// Grouped by WHAT THE CRAWL IS FOR, because that's what the switches in
// site.json → aiPolicy control (train / search / userFetch). robots.njk
// prints a "Disallow: /" group only for a category that is switched OFF;
// allowed bots get no group of their own and simply follow `User-agent: *`.
//
// `token` is the exact User-agent token the vendor documents for robots.txt.
// Bot list as checked against the vendor pages in `doc` during the
// 2026-10-24 review — vendors rename and add bots, so re-check those pages
// when you touch this file. Edit HERE only; robots.njk loops over it.
//
// Deliberately NOT listed (never block them): Googlebot, Bingbot, Applebot
// and facebookexternalhit. They run Google/Bing/Siri search — including
// AI Overviews, AI Mode and Copilot — and social link previews.

module.exports = {
	train: {
		label: "AI model training",
		bots: [
			{ token: "GPTBot", owner: "OpenAI", doc: "https://developers.openai.com/api/docs/bots" },
			{ token: "ClaudeBot", owner: "Anthropic", doc: "https://support.claude.com/en/articles/8896518" },
			{
				token: "Google-Extended",
				owner: "Google: Gemini training AND Gemini-app grounding (not Google Search / AI Overviews)",
				doc: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
			},
			{
				token: "Applebot-Extended",
				owner: "Apple: training only (Applebot still crawls for Siri/Spotlight)",
				doc: "https://support.apple.com/en-us/119829",
			},
			{
				token: "Meta-ExternalAgent",
				owner: "Meta",
				doc: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers",
			},
			{
				token: "CCBot",
				owner: "Common Crawl (open dataset widely used for LLM training)",
				doc: "https://commoncrawl.org/ccbot",
			},
		],
	},
	search: {
		label: "AI search indexes (being cited in answers)",
		bots: [
			{
				token: "OAI-SearchBot",
				owner: "OpenAI / ChatGPT search",
				doc: "https://developers.openai.com/api/docs/bots",
			},
			{
				token: "Claude-SearchBot",
				owner: "Anthropic / Claude search",
				doc: "https://support.claude.com/en/articles/8896518",
			},
			{ token: "PerplexityBot", owner: "Perplexity", doc: "https://docs.perplexity.ai/guides/bots" },
			{
				token: "Meta-WebIndexer",
				owner: "Meta AI search",
				doc: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers",
			},
		],
	},
	userFetch: {
		label: "User-triggered fetches (a person asked an assistant to read a page)",
		bots: [
			{
				token: "ChatGPT-User",
				owner: "OpenAI (its docs: robots.txt rules 'may not apply')",
				doc: "https://developers.openai.com/api/docs/bots",
			},
			{ token: "Claude-User", owner: "Anthropic", doc: "https://support.claude.com/en/articles/8896518" },
			{
				token: "Perplexity-User",
				owner: "Perplexity (its docs: 'generally ignores robots.txt')",
				doc: "https://docs.perplexity.ai/guides/bots",
			},
			{
				token: "Meta-ExternalFetcher",
				owner: "Meta (its docs: 'may bypass robots.txt')",
				doc: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers",
			},
		],
	},
};
