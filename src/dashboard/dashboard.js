import React from 'react';
import ChatListComponent from '../chatlist/chatList';
import { Button, withStyles } from '@material-ui/core';
import styles from './styles';
import ChatViewComponent from '../chatview/chatview';
import ChatTextBoxComponent from '../chattextbox/chattextbox';


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
                    newChatBtnFn={this.newChatButtonClicked}
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


                <Button className={classes.signOutBtn} onClick={this.signOut}>Sign Out</Button>
            </div>
        );
    }

    signOut = () => firebase.auth().signOut();

    selectChat = async (chatIndex) => {
        await this.setState({ selectedChat: chatIndex });
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

    newChatButtonClicked = () => this.setState({ newChatFormVisible: true, selectChat: null });


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