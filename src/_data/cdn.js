// Third-party CDN assets — the ONE place for versions, URLs and SRI hashes.
// Available in every template as {{ cdn.xxx }} (Eleventy global data).
//
//   {{ cdn.bootstrap.css.url }}        {{ cdn.bootstrap.css.integrity }}
//   {{ cdn.bootswatch.themes["darkly"].url }}   (one entry per theme)
//
// Shape: every leaf asset is { url, integrity }.
//   bootstrap      → css, js (bundle incl. Popper)
//   bootstrapIcons → css
//   photoswipe     → css, js (core UMD), lightboxJs (lightbox UMD)
//   bootswatch     → themes: { brite: { url, integrity }, … }   (26 themes)
//                    darkOnly: [ "cyborg", … ]  (plain list of names, not assets)
//                    noGoogleFonts: [ "brite", … ]  (ditto)
//
// WHY SRI ("integrity"): the browser hashes the downloaded file and refuses
// to use it if it doesn't match, so a tampered CDN file can't restyle the
// site or run code. SRI needs crossorigin="anonymous" on the tag (CORS).
//
// BUMPING A VERSION: change the version constant below, then recompute the
// hashes for every file of that package — a stale hash BLOCKS the file:
//   curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
// and prefix the result with "sha384-". Bootstrap's and Bootswatch's
// own hashes must change together (Bootswatch themes are full Bootstrap
// builds of the same version).
//
// Hashes verified 2026-10-25: jsDelivr files recomputed with openssl;
// all 26 Bootswatch 5.3.8 files hashed from the exact cdnjs URLs and
// cross-checked against cdnjs's published SRI (api.cdnjs.com).

const BOOTSTRAP = "5.3.8";
const BOOTSTRAP_ICONS = "1.13.1";
const PHOTOSWIPE = "5.4.4";
const BOOTSWATCH = "5.3.8"; // keep equal to BOOTSTRAP

const jsdelivr = (pkg, version, file) => `https://cdn.jsdelivr.net/npm/${pkg}@${version}/${file}`;

// sha384 of https://cdnjs.cloudflare.com/ajax/libs/bootswatch/5.3.8/<theme>/bootstrap.min.css
const bootswatchSri = {
	brite: "sha384-Ofi7E7ZOYTr4CxupdpiGUzzXde5ISlET4zbL25ujM4xQDsQmnLHb5H5d+Helx0qk",
	cerulean: "sha384-HqhCRk5UwZdbqmzeyYZHCwu3IuFe84q3c8UZtboEpYrdnIwi0RLZDag0RpKbFBHL",
	cosmo: "sha384-QOrayDhdkHbTAsh/gb0iGlDY/xHwI3sdDvyHkxnfpY20Y+Pa8aRHFXmLQYklmIx/",
	cyborg: "sha384-qxGSw6SRX7woR/PK/wbYrdowFJ2DdFQF+nwWswHGKp+jqtYAQKCvBzB/3b+Pjx6W",
	darkly: "sha384-t2UKecXY6tDoQIsEiNhYTaTFWmoHgQT7MV80h9huTejPYLkdgaOHv8ssDrS3Cdcw",
	flatly: "sha384-MZ3pnZEBOL1wAG2nrP+M1A9LCApF229c39UC+1T3B96aI3VjuAWMeb1I99GMJacE",
	journal: "sha384-eRVXTeypnZFrG30qaCO1StJ3gOF9/t2OF+M6BLE1/o69NMCO6W135Be6Z+ajWR6V",
	litera: "sha384-g6vhFEtzOi0DDt7vbQKSu/YNZmo3NJPwXhjhyao/avcyLwyY4C+t630BOB6eoBpF",
	lumen: "sha384-VvtmOf0H1c5UOkg0sTVnp2+DaE7+6PO78xrugFKUni8B3tEbZ6V56DNytr8Zs2ZI",
	lux: "sha384-0hYdc6q9O/GUgxXwzZ4g/D6UAIb+PdD4RbQADGoSKqAGG5yBVeJYHWz1EXZXFjf6",
	materia: "sha384-W2UjBw+COF3Eo7koIX3NVgE5zvvJqgwN/iqcHt00n+MNZlyeUzotrrhvPcZVfSUZ",
	minty: "sha384-7cNn55KSVPdYzfuegchZCGqbVrV6ksXrmgEb1VZbPHSwQqCFDFTrQfg8MsZmSI7u",
	morph: "sha384-x8ZzaWWeiHoeOKxzqViigGot3Uxq/86QdU4PmdzkDbpvqikfiztn9NXAOe9VoDn/",
	pulse: "sha384-s1beQxR3MhCcfAHT7ulQXJiGt1ejAnXU2LMI2I+23+ty05iA1rf+jsy5WiWJOnms",
	quartz: "sha384-1Pk9yPJEOSSDwX+PSDz1BitsclSsBQdVX17SR6KJEzl/LlT5lnTnOArjHcu/4VG1",
	sandstone: "sha384-fNau2pcWOdbUULBw483bxURlLECRa/y2jWlGAJqBbnFzurmThA8gwbpHKogT37Do",
	simplex: "sha384-6ROvCwoH6HDVxMBZrCLzh5t4tMXwFcEXILGqY/fvKl2bQpD4cij1g6fSUA0SbXsh",
	sketchy: "sha384-JydQZovtaTxBDWypezbaeDcTZRTjToRV4VMLNx6PTVbViu5x+4DtMCJQmwpYrZCF",
	slate: "sha384-qhrBcipvKS9sQcI3lcoXpdKNs9jmQAunazzwZW3aZeuFMoRih2NYJIDsr6XTFndn",
	solar: "sha384-sD1IsxtjOsJchPKi0IV4d26qTKtjaSCKexjv71/cyndbK1gFKAz7iPf2xtRbsqpi",
	spacelab: "sha384-6O06/mG6zTPV5qcszBfW91idf95OvvBVrsSlQ23AP7bq5TYK0Gh4lmmHSf47i/B2",
	superhero: "sha384-fU437/gCPFVIYQG5/RnXUGGh+prGONHn6C9GslvteaFVmNCeul6aHunWDz85bM78",
	united: "sha384-CtE18eQN6gdhF75AwSNgRfJDqd3YmE+cpu9NqHKEhsp4Xbh8MbPboXFaGaMjs4oE",
	vapor: "sha384-V2qF16o6CEJntOUT/bjC83Rs2wB24++/hfV0D2AV4lM3rGwY1U56PszercfsQWnm",
	yeti: "sha384-OMwG/TAHy7NRQbZ6SZ/45S4g8n76iLIAkbYP8evydAdSZiO97yIyh5g2zThHlY8r",
	zephyr: "sha384-0qFVRx98HJem0F2omOB5o37vVaRuuesFrDqe5Q292oSriOauZU47Cz7anAMHnYnf",
};

// Bootswatch themes with a DARK default palette (body background #222,
// #002b36, … even under data-bs-theme="light"). Bootstrap's Light/Dark switch
// only mixes palettes on them, so theme-init.njk forces data-bs-theme="dark"
// while one is active and theme-toggle.js disables Light/Auto (high contrast
// stays available). Checked 2026-10-25 against the 5.3.8 files: these 7 are
// the only themes whose default --bs-body-bg is dark.
// TRADE-OFF: forced dark applies the theme's [data-bs-theme=dark] block, which
// is Bootswatch's generic dark palette, not the theme's own designed :root one.
// Darkly, Slate and Solar keep their background (only the text becomes
// #dee2e6), but Cyborg (#060606 → #212529), Superhero (#0f2537 → #212529) and
// Quartz (purple #686dc3 → #212529) lose their background, and Vapor its #32fbe2
// text. So those look different from their bootswatch.com preview. Showing the designed
// palette instead would mean REMOVING data-bs-theme for them (theme-init.njk
// apply()), which also drops Bootstrap's own dark-mode rules (.btn-close etc.).
const bootswatchDarkOnly = ["cyborg", "darkly", "quartz", "slate", "solar", "superhero", "vapor"];

// Bootswatch themes whose CSS does NOT @import Google Fonts. Every other theme
// loads its fonts from fonts.googleapis.com, i.e. sends the visitor's IP to
// Google — legal.njk's "Third-party services" list reads this to stay true.
// Checked 2026-10-25 against the 5.3.8 files (grep -L fonts.googleapis.com);
// re-check when BOOTSWATCH changes.
const bootswatchNoGoogleFonts = ["brite", "cerulean", "litera", "pulse", "quartz", "slate"];

module.exports = {
	bootstrap: {
		version: BOOTSTRAP,
		css: {
			url: jsdelivr("bootstrap", BOOTSTRAP, "dist/css/bootstrap.min.css"),
			integrity: "sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB",
		},
		js: {
			url: jsdelivr("bootstrap", BOOTSTRAP, "dist/js/bootstrap.bundle.min.js"),
			integrity: "sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI",
		},
	},

	bootstrapIcons: {
		version: BOOTSTRAP_ICONS,
		css: {
			url: jsdelivr("bootstrap-icons", BOOTSTRAP_ICONS, "font/bootstrap-icons.min.css"),
			integrity: "sha384-CK2SzKma4jA5H/MXDUU7i1TqZlCFaD4T01vtyDFvPlD97JQyS+IsSh1nI2EFbpyk",
		},
	},

	photoswipe: {
		version: PHOTOSWIPE,
		css: {
			url: jsdelivr("photoswipe", PHOTOSWIPE, "dist/photoswipe.min.css"),
			integrity: "sha384-CKeYI6jsYBV4DV34zRfxht32qlPolZvokUknVb7SnE4PCoiTTqCN47Tr+hQAKkXY",
		},
		js: {
			url: jsdelivr("photoswipe", PHOTOSWIPE, "dist/umd/photoswipe.umd.min.js"),
			integrity: "sha384-k8EKyYcONphQ7zH4cQ0888JapXwrLTXQl/Ue1/jYgjVYahln1NWpnt2S4IC56LNh",
		},
		lightboxJs: {
			url: jsdelivr("photoswipe", PHOTOSWIPE, "dist/umd/photoswipe-lightbox.umd.min.js"),
			integrity: "sha384-IiBVbUz6+U+Tbm/ijO2P0XRwcVzNfrMzloNLkrqHkbi6w5H0v6ie4fI9BIO4SwdK",
		},
	},

	bootswatch: {
		version: BOOTSWATCH,
		darkOnly: bootswatchDarkOnly,
		noGoogleFonts: bootswatchNoGoogleFonts,
		// { brite: { url, integrity }, cerulean: { … }, … } built from the hash list above.
		themes: Object.fromEntries(
			Object.entries(bootswatchSri).map(([theme, integrity]) => [
				theme,
				{
					url: `https://cdnjs.cloudflare.com/ajax/libs/bootswatch/${BOOTSWATCH}/${theme}/bootstrap.min.css`,
					integrity,
				},
			]),
		),
	},
};
