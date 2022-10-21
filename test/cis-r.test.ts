// @ts-ignore
import type { Answer } from "../src/index";
import { _state_properties, CIS, Item, ItemType } from "../src/index";
import { describe, expect, it, vi } from "vitest";
import { writeFileSync, readFileSync } from "fs";

describe.only("CIS-R spec", function () {
  it("should have unique item ids", function () {
    const ids: string[] = [];
    _state_properties.items.forEach((i) => {
      expect(ids.includes(i.id)).toBe(false);
      ids.push(i.id);
    });
  });
  it("should have unique, sequential answer values", function () {
    _state_properties.items.forEach((i) => {
      if (i.answer_options.length) {
        let current: number;
        i.answer_options.forEach((a) => {
          if (typeof current !== "undefined")
            expect(a.value).toEqual(current + 1);
          current = a.value;
        });
      }
    });
  });
});

type Node = {
  question_id: string | undefined;
  answers: Answer[];
  answer_index: number;
};

describe("CIS-R detail", function () {
  const asNode = (q: Item | undefined, answer_index: number): Node => {
    if (typeof q === "undefined")
      throw "Cannot create node from undefined item";
    return {
      question_id: q.id,
      answers: q.answer_options,
      answer_index: answer_index,
    };
  };
  it("should have all paths lead to test end", function () {
    const log = ".test/output.json";
    let state = CIS();
    let complete = vi.spyOn(state, "onComplete");
    let pathway: Node[] = [];
    let pathways_tested = 0;
    try {
      const last_run = JSON.parse(readFileSync(log, { encoding: "utf-8" }));
      pathway = last_run.pathway;
      pathways_tested = last_run.pathways_tested;
    } catch (e) { console.error(e) }
    let breadcrumbs: Node[] = [...pathway];
    let i = 10_000_000;
    let answer: Answer | undefined;
    while (i--) {
      if (!state.current_item) {
        expect(complete).toHaveBeenCalledOnce();
        // Pathway finished, iterate last answer with untaken options
        pathways_tested++;
        writeFileSync(log, JSON.stringify({ pathways_tested, pathway }), { encoding: "utf-8" });
        while (pathway.length) {
          const node = pathway.pop();
          if (!node) return; // Finished
          if (node.answer_index !== node.answers.length - 1) {
            node.answer_index++;
            pathway.push(node);
            break;
          }
        }
        breadcrumbs = [...pathway];
        state = CIS();
        complete = vi.spyOn(state, "onComplete");
      } else {
        // Check for circular pathways
        if (state.item_history.includes(state.current_item))
          throw `Circular link: ${state.current_item?.id} already in item_history.`;
      }

      // Update pathway for current item
      if (
        state.current_item?.answer_options.length &&
        state.current_item?.answer_options.length > 1
      ) {
        if (state.current_item?.conditional_routing) {
          const crumb = breadcrumbs.shift();
          if (!crumb) {
            if (pathway.length > _state_properties.items.length)
              throw `Too many items in pathway: ${pathway.map(
                (p) => p.question_id
              )}`;
            if (pathway.map(i => i.question_id).includes(state.current_item.id))
              throw `Trying to add circular link to pathway: ${state.current_item?.id}`;
            else pathway.push(asNode(state.current_item, 0));
            answer = state.current_item.answer_options[0];
          } else {
            if (state.current_item?.id !== crumb?.question_id)
              throw "mismatched path and pathway";
            else answer = state.current_item.answer_options[crumb.answer_index];
          }
        } else {
          answer = state.current_item.answer_options[0];
        }
      } else {
        if (state.current_item?.answer_options.length)
          answer = state.current_item.answer_options[0];
        else {
          if (state.current_item?.type === ItemType.NUMBER)
            answer = { value: 42 };
          else answer = undefined;
        }
      }
      state.next_q(answer);
      if (!i) throw `Max iterations exceeded! (pathways_tested: ${pathways_tested})`;
    }
    console.log(`Tested ${pathways_tested} unique pathways.`);
  });
});
