import React, { Component } from "react";
import "./App.css";
import './Inbox.scss'
import { fetchUsers, reAuth } from "./api/userFetches"
import { fetchMyConvos, deleteConvo, newConvo } from "./api/convoFetches"
import { Home, Header, Login, Signup, Inbox} from "./components/index.js";
import { Switch, Route, Redirect, withRouter } from "react-router-dom";

class App extends Component {
  constructor() {
    super();
    this.state = {
      currentUser: {},
      currentConvo: [],
      allUsers: [],
      myConvos: [],
    };
    this.socket = undefined;
  }

  updateCurrentUser = ({ currentUser }) => {
    this.setState({ currentUser });
    this.props.history.push("/inbox");
  };

  async componentDidUpdate(prevProps, prevState) {
    if (this.state.currentConvo !== prevState.currentConvo) {
      console.log("started");
      const fetchedMyConvos = await fetchMyConvos(this.state.currentUser);
      this.setState({ myConvos: fetchedMyConvos });
    }
    if (this.state.currentUser?.id !== prevState.currentUser?.id) {
      const fetchedUsers = await fetchUsers();
      this.setState({ allUsers: fetchedUsers });
      const fetchedMyConvos = await fetchMyConvos(this.state.currentUser);
      this.setState({ myConvos: fetchedMyConvos });
    }
  }

  async componentDidMount() {
    if (localStorage.getItem("token") !== null) {
      const checkedUser = await reAuth();
      this.setState({ currentUser: checkedUser });
    }
  }

  handleNewConvoSubmit = async (receiver) => {
    // e.preventDefault();
    const newlyMadeConvo = await newConvo(receiver, this.state.currentUser);
    fetchMyConvos(this.state.currentUser);
    this.setState({ currentConvo: newlyMadeConvo });
    this.socket.close();
    console.log(this.socket);
    this.openWsConnection();
  };

  deleteConvo = async (convo) => {
    deleteConvo(convo);
    this.setState({ currentConvo: {} });
  };
  handleLogout = () => {
    localStorage.removeItem("token");
    this.setState({ currentUser: {} });
    this.props.history.push("/");
  };

  setConvo = (obj) => {
    this.setState({ currentConvo: obj });
  };

  getUserNameById = (id) => {
    if (this.state.allUsers.length !== 0) {
      let user = this.state.allUsers.find((user) => user.id === id);
      return user.user_name.charAt(0).toUpperCase() + user.user_name.slice(1);
    }
  };

  openWsConnection = async () => {
    this.socket = new WebSocket("ws://localhost:3000/cable"); // console.log("1 - Socket is open");
    this.socket.onopen = (e) => {  // console.log("2 - Starting to send a subscription to server");
      let msg = {
        command: "subscribe",
        identifier: JSON.stringify({
          channel: "ChatChannel",
        }),
      };
      this.socket.send(JSON.stringify(msg));
    };

    this.socket.onmessage = (event) => {
      let data = JSON.parse(event.data);
      data.message && !!data.message.true_message ? console.log("We recieved the msg: ", data.message.true_message) : console.log("Still waiting on a message!");
      // check to see if our typed message id exists in our "my convos" or currentConvo.messages before we set state
      if (data.type === "confirm_subscription") {
        const message = {
          command: "message",
          identifier: JSON.stringify({channel: "ChatChannel"}),
          data: JSON.stringify({ action: "convo_connector", message: JSON.stringify({user_id: this.state.currentUser.id,})}),};
        this.socket.send(JSON.stringify(message));
      } else if (Object.keys(this.state.currentConvo).length > 0) {
        let currentConvoMsgIds = this.state.currentConvo.messages && this.state.currentConvo.messages.map((msg) => msg.id);
        if (data.message !== undefined && !!data.message.true_message === true && !currentConvoMsgIds.includes(data.message.true_message.id)) { 
          let convos = this.state.myConvos.map((convo) => {
            if (convo.id === this.state.currentConvo.id) { convo.messages = [...convo.messages, data.message.true_message];
              return convo;
            } else {
              return convo;
            }
          });
          if (Object.keys(this.state.currentConvo).length > 0) {
            let newConvo = { ...this.state.currentConvo };
            newConvo.messages = [...newConvo.messages,data.message.true_message];
            this.setState(
              {myConvos: convos, currentConvo: newConvo,});
          } else {
            this.setState({myConvos: convos,});
          }
        }
      }
    };
  };

  handleSendEvent = async (message, event) => {
    event.preventDefault();
    const msg = {
      command: "message",
      identifier: JSON.stringify({
        channel: "ChatChannel",
      }),
      data: JSON.stringify({
        action: "speak",
        message: {
          content: message,
          user_id: this.state.currentUser.id,
          conversation_id: this.state.currentConvo.id,
        },
      }),
    };
    await this.socket.send(JSON.stringify(msg));
  };

  render() {
    const { currentUser, currentConvo, allUsers, myConvos } = this.state;
    return (
      <div className="App">
        <Header currentUser={currentUser} handleLogout={this.handleLogout} />
        <div className="main">
          <Switch>
            <Route exact path="/" component={Home} />
            <Route exact path="/login" render={(props) => (
                <Login {...props} updateCurrentUser={this.updateCurrentUser} />)}/>
            <Route exact path="/signup" render={(props) => (
                <Signup {...props} updateCurrentUser={this.updateCurrentUser} />)}/>
            {Object.keys(this.state.currentUser).length ? (
              <Route exact path="/inbox" render={(props) => (
                  <Inbox {...props} currentConvo={currentConvo} allUsers={allUsers} currentUser={currentUser} 
                  myConvos={myConvos} getUserNameById={this.getUserNameById} 
                  openWsConnection={this.openWsConnection} handleSendEvent={this.handleSendEvent} handleNewConvo={this.handleNewConvoSubmit} 
                  setConvo={this.setConvo} deleteConvo={this.deleteConvo}/>)}/>
              ) : (
              <Redirect to="/login" />)}
          </Switch>
        </div>
      </div>
    );
  }
}

export default withRouter(App);
