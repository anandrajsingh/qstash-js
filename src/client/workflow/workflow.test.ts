/* eslint-disable @typescript-eslint/no-magic-numbers */
import { describe, expect, test } from "bun:test";
import { WORKFLOW_INTERNAL_HEADER } from "./constants";
import { Workflow } from "./workflow";
import { Client } from "../client";

/**
 * Workflow making the private fields public for testing
 */
export class SpyWorkflow extends Workflow {
  public declare client;
  public declare url;
  public declare workflowId;
  public declare steps;
  public declare executor;
  public declare getParallelCallState;

  static async createWorkflow(request: Request, client: Client) {
    const workflow = Workflow.createWorkflow(request, client) as unknown as {
      workflow: SpyWorkflow;
      isFirstInvocation: boolean;
    };
    return await Promise.resolve(workflow);
  }
}

describe("Workflow", () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const client = new Client({ token: process.env.QSTASH_TOKEN! });

  // following tests should be run in the order they are written
  describe("should decide parallel step state", () => {
    const workflow = new SpyWorkflow({
      client,
      url: "mock",
      workflowId: "wf007",
      steps: [
        {
          stepId: 0,
          stepName: "init",
          concurrent: 0,
          targetStep: 0,
        },
      ],
    });

    test("first request", () => {
      // in this case, we are running a parallel step for the first time since
      // this.stepCount equals this.steps.length

      workflow.executor.stepCount += 2;
      expect(workflow.getParallelCallState(2, 1)).toBe("first");
    });
    test("partial request", () => {
      // in this case, we are currently running a parallel request and the last step
      // is a plan step, meaning that we will execute the corresponding step function
      workflow.steps.push({
        stepId: 0,
        stepName: "mock",
        concurrent: 2,
        targetStep: 1,
      });
      expect(workflow.getParallelCallState(2, 1)).toBe("partial");
    });
    test("discarded request", () => {
      // in this case, we are currently running a parallel request and the last step
      // is NOT a plan step, meaning that we will discard the request
      workflow.steps.push({
        stepId: 1,
        stepName: "mock",
        out: "first result",
        concurrent: 1,
        targetStep: 0,
      });
      expect(workflow.getParallelCallState(2, 1)).toBe("discard");
    });
    test("second partial request", () => {
      // in this case, all results have been received. We will return the results
      workflow.steps.push({
        stepId: 0,
        stepName: "mock",
        concurrent: 2,
        targetStep: 2,
      });
      expect(workflow.getParallelCallState(2, 1)).toBe("partial");
    });
    test("last request", () => {
      workflow.steps.push({
        stepId: 2,
        stepName: "mock",
        out: "second result",
        concurrent: 1,
        targetStep: 0,
      });
      expect(workflow.getParallelCallState(2, 1)).toBe("last");
    });
    test("second pipeline first", () => {
      workflow.executor.stepCount += 2;
      expect(workflow.getParallelCallState(2, 3)).toBe("first");
    });
    test("second pipeline first partial", () => {
      workflow.steps.push({
        stepId: 0,
        stepName: "mock",
        concurrent: 2,
        targetStep: 3,
      });
      expect(workflow.getParallelCallState(2, 3)).toBe("partial");
    });
    test("second pipeline second partial", () => {
      workflow.steps.push({
        stepId: 0,
        stepName: "mock",
        concurrent: 2,
        targetStep: 4,
      });
      expect(workflow.getParallelCallState(2, 3)).toBe("partial");
    });
    test("second pipeline first result", () => {
      workflow.steps.push({
        stepId: 3,
        stepName: "mock",
        concurrent: 1,
        out: "first result",
        targetStep: 0,
      });
      expect(workflow.getParallelCallState(2, 3)).toBe("discard");
    });
    test("second pipeline second result", () => {
      workflow.steps.push({
        stepId: 4,
        stepName: "mock",
        concurrent: 1,
        out: "second result",
        targetStep: 0,
      });
      expect(workflow.getParallelCallState(2, 3)).toBe("last");
    });
    test("validate steps", () => {
      expect(workflow.steps).toEqual([
        {
          stepId: 0,
          stepName: "init",
          concurrent: 0,
          targetStep: 0,
        },
        {
          stepId: 0,
          stepName: "mock",
          concurrent: 2,
          targetStep: 1,
        },
        {
          stepId: 1,
          stepName: "mock",
          out: "first result",
          concurrent: 1,
          targetStep: 0,
        },
        {
          stepId: 0,
          stepName: "mock",
          concurrent: 2,
          targetStep: 2,
        },
        {
          stepId: 2,
          stepName: "mock",
          out: "second result",
          concurrent: 1,
          targetStep: 0,
        },
        {
          stepId: 0,
          stepName: "mock",
          concurrent: 2,
          targetStep: 3,
        },
        {
          stepId: 0,
          stepName: "mock",
          concurrent: 2,
          targetStep: 4,
        },
        {
          stepId: 3,
          stepName: "mock",
          concurrent: 1,
          out: "first result",
          targetStep: 0,
        },
        {
          stepId: 4,
          stepName: "mock",
          concurrent: 1,
          out: "second result",
          targetStep: 0,
        },
      ]);
    });
  });

  describe("should parse request", () => {
    test("initial request", async () => {
      const mockRequest = new Request("https://www.mock.com", {
        headers: {},
        body: '{"foo": "bar"}',
      });

      const { workflow } = await SpyWorkflow.createWorkflow(
        mockRequest as unknown as Request,
        client
      );

      // in initial request workflow, request payload is in out of first call
      expect(workflow.steps).toEqual([
        { stepId: 0, stepName: "init", out: { foo: "bar" }, concurrent: 1, targetStep: 0 },
      ]);
    });

    test("other requests", async () => {
      const mockId = "wf007";
      const mockUrl = "https://www.mock.com/";
      const mockRequest = new Request(mockUrl, {
        headers: {
          [WORKFLOW_INTERNAL_HEADER]: "yes",
          "Upstash-Workflow-Id": mockId,
        },
        // base64 encoding of:
        // "{\"stepId\":0,\"stepName\":\"init\",\"out\":{\"foo\":\"bar\"},\"concurrent\":1,\"targetStep\":0}"
        body: '["IntcInN0ZXBJZFwiOjAsXCJzdGVwTmFtZVwiOlwiaW5pdFwiLFwib3V0XCI6e1wiZm9vXCI6XCJiYXJcIn0sXCJjb25jdXJyZW50XCI6MSxcInRhcmdldFN0ZXBcIjowfSI="]',
      });

      const { workflow } = await SpyWorkflow.createWorkflow(mockRequest, client);

      expect(workflow.workflowId).toBe(mockId);
      expect(workflow.url).toBe(mockUrl);
      expect(workflow.steps).toEqual([
        { stepId: 0, stepName: "init", out: { foo: "bar" }, concurrent: 1, targetStep: 0 },
      ]);

      expect(workflow.steps[0].out).toEqual({ foo: "bar" });
    });
  });
});
