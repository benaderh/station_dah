data = open('index.html', 'rb').read()
print('Count of ???:', data.count(b'???'))

idx = data.find(b'lines.map(l=>{const sens=RUB_SENS')
if idx > 0:
    end_idx = data.find(b'</div>`;}).join("");', idx)
    if end_idx > 0:
        chunk = data[idx:end_idx + 20]
        print('--- FOUND CHUNK ---')
        print(repr(chunk))
