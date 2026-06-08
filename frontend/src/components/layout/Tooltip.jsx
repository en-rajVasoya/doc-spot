import { Tooltip as BSTooltip, OverlayTrigger } from 'react-bootstrap';

function Tooltip({  children,  text,  placement = 'top',  theme = 'default',  offset = [0, 9],}) {
  return (
    <OverlayTrigger
      placement={placement}
      container={document.body}
      popperConfig={{
        modifiers: [
          {
            name: 'offset',
            options: { offset },
          },
        ],
      }}
      overlay={
        <BSTooltip id="custom-tooltip" data-theme={theme}>
          {text}
        </BSTooltip>
      }
    >
      {children}
    </OverlayTrigger>
  );
}

export default Tooltip;



import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Toast from 'react-bootstrap/Toast';

export const AutohideExample = () =>  {
  const [show, setShow] = useState(false);

  return (
    <Row>
      <Col xs={6}>
        <Toast onClose={() => setShow(false)} show={show} delay={3000} autohide>
          <Toast.Header>
            <img
              src="holder.js/20x20?text=%20"
              className="rounded me-2"
              alt=""
            />
            <strong className="me-auto">Bootstrap</strong>
            <small>11 mins ago</small>
          </Toast.Header>
          <Toast.Body>Woohoo, you're reading this text in a Toast!</Toast.Body>
        </Toast>
      </Col>
      <Col xs={6}>
        <Button onClick={() => setShow(true)}>Show Toast</Button>
      </Col>
    </Row>
  );
}

