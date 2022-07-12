from aiohttp import web
import socketio

sio = socketio.AsyncServer(cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

ROOM = 'kitchen'

@sio.event
async def connect(sid, environ):
    print(f'Connect {sid} to room {ROOM}')
    sio.enter_room(sid, ROOM)

@sio.event
def disconnect(sid):
    print(f'Disconnect {sid} from room {ROOM}')
    sio.leave_room(sid, ROOM)

@sio.event
async def message(sid, msg):
    print(f'Message from {sid}: {msg}')
    await sio.emit('message', msg, room=ROOM, skip_sid=sid)

if __name__ == '__main__':
    web.run_app(app, port=11112)