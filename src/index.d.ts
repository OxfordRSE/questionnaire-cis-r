import { Questionnaire, type Answer, type QuestionnaireProperties } from "questionnaire-core/dist";
export * from "../node_modules/questionnaire-core/dist";
export declare const _overall_navigation: (ans: Answer | undefined, state: Questionnaire) => "overall-follow-up" | null;
export declare const _state_properties: QuestionnaireProperties;
export declare const cis: Questionnaire;
export declare const CIS: () => Questionnaire;