import { useState } from 'react'
import './App.css' 
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import {MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator} from '@chatscope/chat-ui-kit-react'
import nlp from 'compromise';




function App() {

  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      message: "Hi, I'm Alex, your friendly Appointment Assistant! 😊 Ready to book your appointment? We have availability Monday - Friday anytime between 11am and 7pm.  Please share your preferred date and time. Let's secure your appointment today! 🗓️🕒",
      sender: "Alex",
    }
  ])

  const handleSend = async (message) => {
    const newMessage = {
      message: message,
      sender: "user",
      direction : "outgoing"

    }
    const newMessages = [...messages, newMessage]
    // updeate message state
    setMessages(newMessages);

    // typing indecator
    setTyping(true);

    function getCurrentDateFormatted() {
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      const formattedDate = new Intl.DateTimeFormat('en-US', options).format(new Date());
      return formattedDate;
    }
    
    const currentDate = getCurrentDateFormatted();
    // process messages
    await processMessageToChatGpt(newMessages, currentDate);
  }

 
//
  async function processMessageToChatGpt(chatMessages, currentDate) {
    try {
      const apiMessages = chatMessages.map((messageObject) => {
        const role = messageObject.sender === "Gregory the great" ? "assistant" : "user";
        return { role, content: messageObject.message };
      });
  
      // Check if the user's message mentions setting an appointment
      const userMessage = chatMessages[chatMessages.length - 1].message.toLowerCase();
      if (containsAppointmentTrigger(userMessage)) {
        // If the user mentions setting an appointment, generate and send the appointment link
        const appointmentLink = generateAppointmentLink();
        const appointmentResponse = `You can schedule your appointment using this link: ${appointmentLink}`;
  
        setMessages([...chatMessages, { message: appointmentResponse, sender: "Gregory the great" }]);
        setTyping(false);
        // setShowAppointmentForm(true);
        return;
      }

      console.log('todays date is:', currentDate);

      const systemMessage = {
        role: "system",
        content: `Today's date is ${currentDate}, Your name is Alex, a Appointment setting assistant bot who is friendly and nice! You are short and accurate with your responses and you are looking to set an appointment by reaching out. You want them to book an appointment with a date and time that is monday-friday between the hours of 11am - 7pm and make sure you let them know it'll be a 1 hour slot ex: you are scheduled December 12th 2023 from 1pm-2pm, also once a user provides you with there name, email, and phone number please reiterate it back in the forllowng format Name: , Email: , Phone: ,Date: MM/DD/YY , Time:  . but only if you have all the informmation at once. Make sure you do not tell them you will reiterate back just sound natural but tell them to confirm it is correct in a seperate message.`
      };
  
      const apiRequestBody = {
        model: "ft:gpt-3.5-turbo-1106:lilikoi-agency::8aXkkAuM",
        messages: [systemMessage, ...apiMessages],
      };
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_REACT_APP_APP_KEY_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequestBody)
      });
  
      const data = await response.json();
      console.log(data);
      console.log(data.choices[0].message.content);
      const botMessageContent = data.choices[0].message.content;
      containsContactInfo(botMessageContent);
      setMessages([...chatMessages, { message: botMessageContent, sender: "Alex" }]);
      setTyping(false);
    } catch (error) {
      console.error('Error communicating with the chatbot:', error);
      setMessages([...chatMessages, {
        message: 'Error communicating with the chatbot',
        sender: "System"
      }]);
      setTyping(false);
    }
  }

  function containsAppointmentTrigger(userMessage) {
    // Define keywords or phrases that indicate the intent to schedule an appointment
    const appointmentTriggers = ["appointment", "set appointment", "book appointment", "consultion"];
  
    // Tokenize the user's message
    const tokens = nlp(userMessage).out('array');
  
    // Check if any of the triggers are present in the tokens
    return appointmentTriggers.some(trigger =>
      tokens.some(token => token.toLowerCase().includes(trigger))
    );
  }

  function generateAppointmentLink() {
    // Example: Generating a static hyperlink to www.sempersolaris.com/appointment
    return '<a href="https://appointment.sempersolaris.com/" target="_blank" rel="noopener noreferrer">Schedule your appointment</a>';
  }

  function extractContactInfoMatch(userMessage) {
    // Define a regex pattern to match contact information, date, and time
    const contactInfoPattern = /name:\s*([\w\s]+),\s*email:\s*([\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,})\s*,\s*phone:\s*([\d\s-]+),\s*date:\s*([\w\s]+),\s*time:\s*([\w:]+)\./i;
    return userMessage.match(contactInfoPattern);
  }

  function containsContactInfo(botMessage) {
    // Regular expression to match the contact information
    const regex = /Name:\s*(.*?),\s*Email:\s*(.*?),\s*Phone:\s*(.*?),\s*Date:\s*(.*?),\s*Time:\s*(.*?)\./i;
    const regex2 = /Name: (.*)\nEmail: (.*)\nPhone: (.*)\nDate: (.*)\nTime: (.*)/;
    

    
  
    // Attempt to match the regular expression
    const match = botMessage.match(regex);
    const match2 = botMessage.match(regex2);

    console.log('Message:', botMessage);
    console.log('Match:', match);
    console.log('Match2:', match2);
    // Check if there's a match
    if (match) {
      const [, name, email, phone, date, time] = match; // Destructure the matched groups
      name.replace(/\n/g, '').trim();
      email.replace(/\n/g, '').trim();
      phone.replace(/\n/g, '').trim();
      date.replace(/\n/g, '').trim();
      time.replace(/\n/g, '').trim();
      
      const contactInfo = { name, email, phone, date, time };
      console.log('Contact Information:', {contactInfo });
      postToWebhook(contactInfo);
      return true;
    } else if (match2){
      const [, name, email, phone, date, time] = match2; // Destructure the matched groups
      name.replace(/\n/g, '').trim();
      email.replace(/\n/g, '').trim();
      phone.replace(/\n/g, '').trim();
      date.replace(/\n/g, '').trim();
      time.replace(/\n/g, '').trim();
      
      const contactInfo = { name, email, phone, date, time };
      console.log('Contact Information:', {contactInfo });
      postToWebhook(contactInfo);
      return true;
    }
    
    // No match found
    console.log("no match")
    return false;
  }

  async function postToWebhook(contactInfo) {
    try {
      const webhookUrl = 'https://hooks.zapier.com/hooks/catch/807991/3fuqflw/'; // Replace with your actual webhook URL
      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(contactInfo),
      });
  
      if (response.ok) {
        console.log('Contact information sent to webhook successfully.');
      } else {
        console.error('Failed to send contact information to webhook.');
      }
    } catch (error) {
      console.error('Error posting to webhook:', error, JSON.stringify(contactInfo));
    }
  }





  return (
    <>
      <div className="App">
      <div style={{position: "relative", height:"800px", width: "400px", textAlign: 'left', maxWidth: "100vw", maxHeight: '100vh'}}>
        <MainContainer>
          <ChatContainer>
           
            <MessageList typingIndicator={typing ? <TypingIndicator content="Alex"/> : null }>
              {messages.map((message, i) => {
                  return <Message key={i} model={message} content={message.message}/>
              })}
            </MessageList>
           

            <MessageInput attachButton={false} placeholder='Type Message' onSend={handleSend}/>
          </ChatContainer>
          
        </MainContainer>

      </div>
      
      </div>
    </>
  )
}

export default App
 