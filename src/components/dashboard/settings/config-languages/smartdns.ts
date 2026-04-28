/* eslint-disable unicorn/prefer-regexp-test */
import { StreamLanguage, LanguageSupport } from "@codemirror/language";
import type { StringStream } from "@codemirror/language";

/**
 * SmartDNS configuration file syntax highlighting.
 * Token classes (vscodeDark/vscodeLight compatible):
 *   keyword      – directives at line start  (bind, server, address, ...)
 *   variableName – options (-group, -no-cache, -fallback, @device, ...)
 *   number       – IPs, ports, CIDR, yes/no/none/on/off
 *   url          – https://..., /domain/, domain:geosite:xxx
 *   string       – "quoted strings", /file/paths
 *   comment      – # line comments
 */

// ─── Static Sets ─────────────────────────────────────────────────────────────

const directives = new Set([
	"bind", "bind-tcp", "bind-tls", "bind-https",
	"bind-cert-file", "bind-cert-key-file", "bind-cert-key-pass",
	"tcp-idle-time",
	"server-name", "resolv-hostname", "user", "conf-file", "data-dir", "hosts-file",
	"cache-size", "cache-mem-size", "cache-persist", "cache-file", "cache-checkpoint-time",
	"prefetch-domain", "serve-expired", "serve-expired-ttl", "serve-expired-reply-ttl",
	"bogus-nxdomain", "blacklist-ip", "whitelist-ip", "ignore-ip", "ip-alias",
	"speed-check-mode", "force-AAAA-SOA", "force-qtype-SOA", "response-mode",
	"max-reply-ip-num", "max-query-limit",
	"dualstack-ip-selection", "dualstack-ip-selection-threshold", "dualstack-ip-allow-force-AAAA",
	"edns-client-subnet",
	"rr-ttl", "rr-ttl-min", "rr-ttl-max", "rr-ttl-reply-max",
	"log-level", "log-file", "log-console", "log-syslog", "log-size", "log-num", "log-file-mode",
	"audit-enable", "audit-SOA", "audit-file", "audit-console", "audit-syslog",
	"audit-size", "audit-num", "audit-file-mode",
	"ca-file", "ca-path", "dnsmasq-lease-file",
	"server", "server-tcp", "server-tls", "server-quic", "server-https", "server-http3", "server-h3",
	"proxy-server",
	"nameserver", "expand-ptr-from-address",
	"address", "cname", "srv-record", "https-record", "dns64",
	"ipset", "ipset-timeout", "ipset-no-speed",
	"nftset", "nftset-timeout", "nftset-no-speed", "nftset-debug",
	"domain-rules", "domain-set",
	"ip-rules", "ip-set",
	"client-rules", "group-begin", "group-match", "group-end",
	"ddns-domain", "local-domain", "mdns-lookup",
	"plugin",
	"smartdns-ui.www-root", "smartdns-ui.ip", "smartdns-ui.token-expire",
	"smartdns-ui.max-query-log-age", "smartdns-ui.enable-terminal",
	"smartdns-ui.enable-cors", "smartdns-ui.user", "smartdns-ui.password",
	"geosite-updater", "geosite-dat", "geosite-set",
]);

const booleanValues = new Set(["yes", "no", "none", "on", "off"]);

// ─── Token Function ───────────────────────────────────────────────────────────

function token(stream: StringStream): string | null {
	// 1. Comment: # to end of line
	if (stream.peek() === "#") {
		stream.skipToEnd();
		return "comment";
	}

	// 2. Whitespace: consume and ask for next token
	if (stream.match(/^\s+/)) {
		return null;
	}

	// 3. Directive: ONLY when at actual start of line (sol = true)
	if (stream.sol()) {
		if (stream.match(/^[a-zA-Z][a-zA-Z0-9_.-]*/)) {
			if (directives.has(stream.current())) {
				return "keyword";
			}
		}
	}

	// 4. Double-quoted string
	if (stream.peek() === '"') {
		stream.next();
		while (!stream.eol()) {
			const ch = stream.next();
			if (ch === "\\") {
				stream.next(); // skip escaped char
			} else if (ch === '"') {
				break;
			}
		}
		return "string";
	}

	// 5. URL: https://... or tls://... etc. (full URL, stops at whitespace)
	if (stream.match(/^https?:\/\/[^\s\\#"]+/)) {
		return "url";
	}

	// 6. Domain / geosite pattern: /domain/ or domain:geosite:xxx
	if (stream.match(/^\/(?!\/)[^\s\\#"]+/)) {
		return "url";
	}
	if (stream.match(/^domain:geosite:[a-zA-Z0-9_-]+/)) {
		return "url";
	}

	// 7. Special modifiers: #  #4  #6  -  -4  -6
	if (stream.match(/^#[46]?|^-[46]?/)) {
		return "number";
	}

	// 8. Dash-prefixed option: -group  -no-cache  -fallback  ...
	if (stream.match(/^-[a-zA-Z][a-zA-Z0-9_-]*/)) {
		return "variableName";
	}

	// 9. IPv6 with brackets: [::]  [::1]:8080
	if (stream.match(/^\[[:0-9a-fA-F]+\](:\d+)?/)) {
		return "number";
	}

	// 10. IPv4 / CIDR / port: 192.168.1.1/24:53
	if (stream.match(/^\d{1,3}(\.\d{1,3}){1,3}(\/\d{1,2})?(:\d+)?/)) {
		return "number";
	}

	// 11. File path: /etc/smartdns/...  ./sina.list
	if (stream.match(/^\/[^\s\\#"]+/) || stream.match(/^.[^\s\\#"]*/)) {
		return "string";
	}

	// 12. Line continuation: \
	if (stream.match(/\\$/)) {
		return null;
	}

	// 13. Boolean values: yes  no  none  on  off
	if (stream.match(/^[a-zA-Z]+/)) {
		if (booleanValues.has(stream.current())) {
			return "number";
		}
	}

	// 14. Number: 128k  16m  1g  or plain digits like 10000  86400
	if (stream.match(/^\d+[kmg]?/)) {
		return "number";
	}

	// 15. Device suffix: @eth0
	if (stream.match(/^@[a-zA-Z0-9_-]+/)) {
		return "variableName";
	}

	// 16. Unknown char: skip one and continue
	stream.next();
	return null;
}

// ─── Language Definition ───────────────────────────────────────────────────────

const smartdnsLanguage = StreamLanguage.define({
	name: "smartdns",
	token,
	startState() {
		return {};
	},
	blankLine(state: object) {
		return state;
	},
});

export const smartdns = (): LanguageSupport => new LanguageSupport(smartdnsLanguage);
