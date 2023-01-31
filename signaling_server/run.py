from aiohttp import web
import socketio
# import ssl

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
    print(f'Message from {sid}: {msg}\n{"-"*20}')
    await sio.emit('message', msg, room=ROOM, skip_sid=sid)

if __name__ == '__main__':
    # ssl_context = ssl.SSLContext()
    # ssl_context.load_cert_chain("../web/cert.pem", "../web/key.pem")
    web.run_app(app, port=11112) #, ssl_context=ssl_context)
