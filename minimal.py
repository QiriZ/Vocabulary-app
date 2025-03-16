from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>简易版生词学习网站</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            h1 { color: #333; }
            p { color: #666; }
        </style>
    </head>
    <body>
        <h1>生词学习网站 - 简易版</h1>
        <p>这是一个简化版本，用于测试网站连接是否正常。</p>
        <p>如果你能看到这个页面，说明基本连接已经正常工作！</p>
        <a href="/api/status">点击这里测试API功能</a>
    </body>
    </html>
    """

@app.route('/api/status')
def status():
    return jsonify({
        "status": "ok",
        "message": "API正常工作"
    })

if __name__ == '__main__':
    app.run(debug=True)
