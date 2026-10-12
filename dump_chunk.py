data = open('index.html','rb').read()
idx = data.find(b'lines.map(l=>{const sens=RUB_SENS')
if idx > 0:
    end_idx = data.find(b'</div>`;}).join("");', idx)
    if end_idx > 0:
        chunk = data[idx:end_idx + 20]
        print('--- FOUND CHUNK ---')
        print(repr(chunk))
    else:
        print('End not found')
else:
    print('Start not found')
