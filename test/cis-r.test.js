import { _state_properties, CIS, ItemType } from "../src/index";
import { describe, expect, it, vi } from "vitest";
import { writeFileSync, readFileSync } from "fs";
describe.only("CIS-R spec", function () {
    it("should have unique item ids", function () {
        const ids = [];
        _state_properties.items.forEach((i) => {
            expect(ids.includes(i.id)).toBe(false);
            ids.push(i.id);
        });
    });
    it("should have unique, sequential answer values", function () {
        _state_properties.items.forEach((i) => {
            if (i.answer_options.length) {
                let current;
                i.answer_options.forEach((a) => {
                    if (typeof current !== "undefined")
                        expect(a.value).toEqual(current + 1);
                    current = a.value;
                });
            }
        });
    });
});
describe("CIS-R detail", function () {
    const asNode = (q, answer_index) => {
        if (typeof q === "undefined")
            throw "Cannot create node from undefined item";
        return {
            question_id: q.id,
            answers: q.answer_options,
            answer_index: answer_index,
        };
    };
    it("should have all paths lead to test end", function () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const log = ".test/output.json";
        let state = CIS();
        let complete = vi.spyOn(state, "onComplete");
        let pathway = [];
        let pathways_tested = 0;
        try {
            const last_run = JSON.parse(readFileSync(log, { encoding: "utf-8" }));
            pathway = last_run.pathway;
            pathways_tested = last_run.pathways_tested;
        }
        catch (e) {
            console.error(e);
        }
        let breadcrumbs = [...pathway];
        let i = 10000000;
        let answer;
        while (i--) {
            if (!state.current_item) {
                expect(complete).toHaveBeenCalledOnce();
                // Pathway finished, iterate last answer with untaken options
                pathways_tested++;
                writeFileSync(log, JSON.stringify({ pathways_tested, pathway }), { encoding: "utf-8" });
                while (pathway.length) {
                    const node = pathway.pop();
                    if (!node)
                        return; // Finished
                    if (node.answer_index !== node.answers.length - 1) {
                        node.answer_index++;
                        pathway.push(node);
                        break;
                    }
                }
                breadcrumbs = [...pathway];
                state = CIS();
                complete = vi.spyOn(state, "onComplete");
            }
            else {
                // Check for circular pathways
                if (state.item_history.includes(state.current_item))
                    throw `Circular link: ${(_a = state.current_item) === null || _a === void 0 ? void 0 : _a.id} already in item_history.`;
            }
            // Update pathway for current item
            if (((_b = state.current_item) === null || _b === void 0 ? void 0 : _b.answer_options.length) &&
                ((_c = state.current_item) === null || _c === void 0 ? void 0 : _c.answer_options.length) > 1) {
                if ((_d = state.current_item) === null || _d === void 0 ? void 0 : _d.conditional_routing) {
                    const crumb = breadcrumbs.shift();
                    if (!crumb) {
                        if (pathway.length > _state_properties.items.length)
                            throw `Too many items in pathway: ${pathway.map((p) => p.question_id)}`;
                        if (pathway.map(i => i.question_id).includes(state.current_item.id))
                            throw `Trying to add circular link to pathway: ${(_e = state.current_item) === null || _e === void 0 ? void 0 : _e.id}`;
                        else
                            pathway.push(asNode(state.current_item, 0));
                        answer = state.current_item.answer_options[0];
                    }
                    else {
                        if (((_f = state.current_item) === null || _f === void 0 ? void 0 : _f.id) !== (crumb === null || crumb === void 0 ? void 0 : crumb.question_id))
                            throw "mismatched path and pathway";
                        else
                            answer = state.current_item.answer_options[crumb.answer_index];
                    }
                }
                else {
                    answer = state.current_item.answer_options[0];
                }
            }
            else {
                if ((_g = state.current_item) === null || _g === void 0 ? void 0 : _g.answer_options.length)
                    answer = state.current_item.answer_options[0];
                else {
                    if (((_h = state.current_item) === null || _h === void 0 ? void 0 : _h.type) === ItemType.NUMBER)
                        answer = { value: 42 };
                    else
                        answer = undefined;
                }
            }
            state.next_q(answer);
            if (!i)
                throw `Max iterations exceeded! (pathways_tested: ${pathways_tested})`;
        }
        console.log(`Tested ${pathways_tested} unique pathways.`);
    });
});
