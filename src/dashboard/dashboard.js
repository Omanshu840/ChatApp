import React from 'react';
import ChatListComponent from '../chatlist/chatList';
import { Button, withStyles } from '@material-ui/core';
import styles from './styles';
import ChatViewComponent from '../chatview/chatview';
import ChatTextBoxComponent from '../chattextbox/chattextbox';
import NewChatComponent from '../newchat/newchat'


const firebase = require("firebase");

class DashboardComponent extends React.Component {

    constructor() {
        super();
        this.state = {
            selectedChat: null,
            newChatFormVisible: false,
            email: null,
            chats: []
        };
    }

    render() {

        const { classes } = this.props;

        return (
            <div>
                <ChatListComponent
                    history={this.props.history}
                    newChatBtnFn={this.newChatBtnClicked}
                    selectChatFn={this.selectChat}
                    chats={this.state.chats}
                    userEmail={this.state.email}
                    selectedChatIndex={this.state.selectedChat}
                ></ChatListComponent>
                {
                    this.state.newChatFormVisible ?
                        null :
                        <ChatViewComponent
                            user={this.state.email}
                            chat={this.state.chats[this.state.selectedChat]}></ChatViewComponent>
                }

                {
                    this.state.selectedChat !== null && !this.state.newChatFormVisible ?
                        <ChatTextBoxComponent messageReadFn={this.messageRead} submitMessageFn={this.submitMessage}></ChatTextBoxComponent> :
                        null
                }
                {
                    this.state.newChatFormVisible ? <NewChatComponent goToChatFn={this.goToChat} newChatSubmitFn={this.newChatSubmit}></NewChatComponent> : null
                }

                <Button className={classes.signOutBtn} onClick={this.signOut}>Sign Out</Button>
            </div>
        );
    }

    signOut = () => firebase.auth().signOut();

    selectChat = async (chatIndex) => {
        await this.setState({ selectedChat: chatIndex, newChatFormVisible: false });
        this.messageRead();
    }

    submitMessage = (msg) => {
        const docKey = this.buildDocKey(this.state.chats[this.state.selectedChat].users.filter(_usr => _usr !== this.state.email)[0]);
        firebase
            .firestore()
            .collection('chats')
            .doc(docKey)
            .update({
                messages: firebase.firestore.FieldValue.arrayUnion({
                    sender: this.state.email,
                    message: msg,
                    timestamp: Date.now()
                }),
                receiverHasRead: false
            });
    }

    buildDocKey = (friend) => [this.state.email, friend].sort().join(":");

    newChatBtnClicked = () => this.setState({ newChatFormVisible: true, selectChat: null });


    messageRead = () => {
        const dockey = this.buildDocKey(this.state.chats[this.state.selectedChat].users.filter(_usr => _usr !== this.state.email)[0]);
        if (this.clickedChatwhereNotSender(this.state.selectedChat)) {
            firebase
                .firestore()
                .collection('chats')
                .doc(dockey)
                .update({ receiverHasRead: true })
        } else {
            console.log('clicked message');
        }
    }


    goToChat = async (docKey, msg) => {
        const userInChat = docKey.split(':');
        const chat = this.state.chats.find(_chat => userInChat.every(_user => _chat.users.includes(_user)));
        this.setState({ newChatFormVisible: false });
        await this.selectChat(this.state.chats.indexOf(chat));
        this.submitMessage(msg);
    }

    newChatSubmit = async (chatObj) => {
        const docKey = this.buildDocKey(chatObj.sendTo);
        await firebase
            .firestore()
            .collection('chats')
            .doc(docKey)
            .set({
                receiverHasRead: false,
                users: [this.state.email, chatObj.sendTo],
                messages: [{
                    message: chatObj.message,
                    sender: this.state.email
                }]
            })
        this.setState({ newChatFormVisible: false });
        this.selectChat(this.state.chats.length - 1);
    }


    clickedChatwhereNotSender = (chatindex) => this.state.chats[chatindex].messages[this.state.chats[chatindex].messages.length - 1].sender !== this.state.email;


    componentDidMount = () => {
        firebase.auth().onAuthStateChanged(async _usr => {
            if (!_usr) {
                this.props.history.push('/login');
            }
            else {
                await firebase
                    .firestore()
                    .collection('chats')
                    .where('users', 'array-contains', _usr.email)
                    .onSnapshot(async res => {
                        const chats = res.docs.map(_doc => _doc.data());
                        await this.setState({
                            email: _usr.email,
                            chats: chats
                        });
                        console.log(this.state);
                    })
            }
        })
    }

}

export default withStyles(styles)(DashboardComponent);