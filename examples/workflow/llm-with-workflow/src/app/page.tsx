'use client';

import { useRef, useState } from 'react';
import { Button, Row, Col } from 'antd';
import { IconLoader2 } from '@tabler/icons-react';
import RegularCall from './components/regular-call';
import WorkflowCall from './components/workflow-call';

export default function Page() {
  const [state, setState] = useState(0);

  const bottomRef = useRef(null)
  // const [higlightRef, setHiglightRef] = useState<boolean>(false);
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      // setHiglightRef(true);
      ref.current.scrollIntoView({ behavior: 'smooth' });
      // setTimeout(() => {
      //   setHiglightRef(false);
      // }, 1000); // Adjust delay as needed
    }
  };

  const handleClick = () => {
    setState(2);
  };

  return (
    <div className="min-h-screen flex flex-col items-center space-y-4 p-4">
      <div className='w-1/2'>
        <img
          className="w-10 mb-8"
          src="/upstash-logo.svg"
          alt="upstash logo"
        />

        <h1 className="text-2xl font-semibold">
          Calling LLMs with/without Workflow
        </h1>
        <h2 className="text-lg opacity-60">
        In this example, we compare the difference between calling OpenAI directly versus calling with  Upstash Workflow.
        </h2>
        <br/>
        <p className='opacity-80 text-sm mb-2'>
          Below, you will find a button to trigger two endpoints. Regular Call is how you would usually call OpenAI. Workflow Call on the other hand, shows how Upstash Workflow can be used for the same purpose.
        </p>
        <p className='opacity-80 text-sm'>
          When you click the button, two endpoints will be called at once and the results will be shown, along with durations and approximate cost. You can learn more about the durations and how the cost is calculated at the bottom of the page.
        </p>
      </div>
      {/* Button section occupying 25% of the page */}
      <div className="w-full h-1/4 flex justify-center items-center">
        <Button
          onClick={handleClick} 
          disabled={state !== 0}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-white flex items-center justify-center"
        >
          {state !== 0 && <IconLoader2 className="animate-spin" />}
          Call Endpoints
        </Button>
      </div>

      {/* Components section occupying 75% of the page */}
      <div className="w-full h-3/4 flex justify-center">
        <Row gutter={16} className="w-3/4">
          <Col span={12}>
            <RegularCall state={state} setState={setState} onScrollClick={() => scrollToSection(bottomRef)}/>
          </Col>
          <Col span={12}>
            <WorkflowCall state={state} setState={setState} onScrollClick={() => scrollToSection(bottomRef)}/>
          </Col>
        </Row>
      </div>

      {/* Info section */}
      <div
        // className={higlightRef
        //   ? 'w-1/2 p-2 rounded-lg bg-emerald-50'
        //   : 'w-1/2 p-2 rounded-lg'}
        className="w-1/2"
        ref={bottomRef} >
        <p className='opacity-80 text-sm mb-2'>
          <span className="font-bold">Total Duration</span> stands for the amount of time passed between the initial request and the llm result arriving in the UI. It depends on the length of the output generated by the LLM. It's expected to be higher in Upstash Workflow.
        </p>
        <p className='opacity-80 text-sm mb-2'>
          <span className="font-bold">Vercel Function Duration</span> stands for the amount of time a vercel function has been awake, executing or waiting for a response. It's much higher in the Regular Call case because the function has to wait for LLM to finish. In the case of Upstash Workflow, QStash waits for the LLM so function duration is much lower.
        </p>
        <p className='opacity-80 text-sm mb-2'>
          <span className="font-bold">Approximate Cost</span> is calculated by multipliying the vercel function duration with the cost per second for the Basic Function in Vercel. The lowest possible cost per second for Vercel's cheapest 1 GB function is calculated as <a href="https://vercel.com/docs/functions/usage-and-pricing#node.js-python-ruby-and-go-runtimes" target="_blank" className='text-emerald-500'>$0.18</a> ÷ 3600, which equals $0.00005 per second. For the calculation of Workflow, we also include <a href='https://upstash.com/pricing/qstash' target='_blank' className='text-emerald-500'>the QStash cost, which is $1 per 100k messages</a>. Each workflow in this example makes 4 QStash requests.
        </p>
      </div>
    </div>
  );
}
