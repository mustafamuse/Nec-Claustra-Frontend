import React, { Component } from 'react'

export class PeopleList extends Component {

    getOtherUserName = () => {
        if (this.props.allUsers.length !== 0) {
            let otherUserId;
            if (this.props.currentUser.id === this.props.convo.receiver_id) {
                otherUserId = this.props.convo.sender_id
            } else {
                otherUserId = this.props.convo.receiver_id
            }
            let otherUser = this.props.allUsers.find(user => user.id === otherUserId)
            return otherUser.first_name
        }

    }

    render() {
        return (
            <li className="clearfix">
                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" className="about" onClick={() => this.props.setConvo(this.props.convo)} />
                <div className="about" >
                    <div className="name">{this.getOtherUserName()}</div>
                    <div className="status">
                        <i className="fa fa-circle online"></i> online
                                </div>
                </div>
            </li>
        )
    }
}

export default PeopleList