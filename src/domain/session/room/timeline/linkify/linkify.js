import { regex } from "./regex.js";

export function linkify(text, callback) {
    const matches = text.matchAll(regex);
    let curr = 0;
    for (let match of matches) {
        const precedingText = text.slice(curr, match.index);
        callback(precedingText, false);
        callback(match[0], true);
        const len = match[0].length;
        curr = match.index + len;
    }
    const remainingText = text.slice(curr);
    callback(remainingText, false);
}

export function tests() {

    class MockCallback {
        mockCallback(text, isLink) {
            if (!text.length) {
                return;
            }
            if (!this.result) {
                this.result = [];
            }
            const type = isLink ? "link" : "text";
            this.result.push({ type: type, text: text });
        }
    }

    function test(assert, input, output) {
        const m = new MockCallback;
        linkify(input, m.mockCallback.bind(m));
        assert.deepEqual(output, m.result);
    }

    function testLink(assert, link, expectFail = false) {
        const input = link;
        const output = expectFail ? [{ type: "text", text: input }] :
            [{ type: "link", text: input }];
        test(assert, input, output);
    }

    return {
        "Link with host": assert => {
            testLink(assert, "https://matrix.org");
        },

        "Link with host & path": assert => {
            testLink(assert, "https://matrix.org/docs/develop");
        },

        "Link with host & fragment": assert => {
            testLink(assert, "https://matrix.org#test");
        },

        "Link with host & query": assert => {
            testLink(assert, "https://matrix.org/?foo=bar");
        },

        "Complex link": assert => {
            const link = "https://www.foobar.com/url?sa=t&rct=j&q=&esrc=s&source" +
                "=web&cd=&cad=rja&uact=8&ved=2ahUKEwjyu7DJ-LHwAhUQyzgGHc" +
                "OKA70QFjAAegQIBBAD&url=https%3A%2F%2Fmatrix.org%2Fdocs%" +
                "2Fprojects%2Fclient%2Felement%2F&usg=AOvVaw0xpENrPHv_R-" +
                "ERkyacR2Bd";
            testLink(assert, link);
        },

        "Localhost link": assert => {
            testLink(assert, "http://localhost");
            testLink(assert, "http://localhost:3000");
        },

        "IPV4 link": assert => {
            testLink(assert, "https://192.0.0.1");
            testLink(assert, "https://250.123.67.23:5924");
        },

        "IPV6 link": assert => {
            testLink(assert, "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]");
            testLink(assert, "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:7000");
        },

        "Missing scheme must not linkify": assert => {
            testLink(assert, "matrix.org/foo/bar", true);
        },

        "Punctuation at end of link must not linkify": assert => {
            const link = "https://foo.bar/?nenjil=lal810";
            const end = ".,? ";
            for (const char of end) {
                const out = [{ type: "link", text: link }, { type: "text", text: char }];
                test(assert, link + char, out);
            }
        },

        "Unicode in hostname must not linkify": assert => {
            const link = "https://foo.bar\uD83D\uDE03.com";
            const out = [{ type: "link", text: "https://foo.bar" },
            { type: "text", text: "\uD83D\uDE03.com" }];
            test(assert, link, out);
        },

        "Link with unicode only after / must linkify": assert => {
            testLink(assert, "https://foo.bar.com/\uD83D\uDE03");
        },

        "Link with unicode after fragment without path must linkify": assert => {
            testLink(assert, "https://foo.bar.com#\uD83D\uDE03");
        },

        "Link ends with <": assert => {
            const link = "https://matrix.org<";
            const out = [{ type: "link", text: "https://matrix.org" }, { type: "text", text: "<" }];
            test(assert, link, out);
        }
    };
}
