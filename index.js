const { NodeSSH } = require("node-ssh");
const fs = require("fs");
const process = require("process");
const path = require("path");

let userConfig = "";

//判断配置文件是否存在
if (fs.existsSync(path.resolve("auto-sync.json"))) {
  userConfig = fs.readFileSync(path.resolve("auto-sync.json"), "utf-8");
} else {
  //创建配置文件
  const initData = {
    host: "19.168.x.x",
    username: "root",
    password: "xxxxxxxx",
    remotePath: "/www/wwwroot/test",
    localPath: "dist",
    tips1: "远程目录(remotePath)必须以 '/' 结束",
    tips2:"本地目录(localPath)必须在当前目录下"
  };
  fs.writeFileSync(
    path.resolve("auto-sync.json"),
    JSON.stringify(initData),
    "utf-8"
  );
  console.log("已初始化配置文件，配置完成后重新运行");
  return false;
}

const config = JSON.parse(userConfig);

config.localPath = path.resolve(process.cwd(), config.localPath);

//根目录禁止操作
if (config.remotePath.split("/").length < 2) {
  console.log("远程目录存在风险");
  return false;
}

//本地文件不存在退出程序
if (!fs.existsSync(config.localPath)) {
  console.log("本地目录不存在");
  return false;
}

createConnection();

async function createConnection() {
  const ssh = new NodeSSH();
  //连接服务器
  try {
    await ssh.connect(({ host, username, password } = config));
  } catch (err) {
    console.log("服务器连接错误", err);
  }

  //传输本地文件至远程目录
  try {
    let status = await ssh.putDirectory(config.localPath, config.remotePath, {
      recursive: true,
      concurrency: 10,
      validate: function (itemPath) {
        //文件过滤
        const baseName = path.basename(itemPath);
        return (
          baseName.substring(0, 1) !== "."
          // && baseName !== "node_modules"
        );
      },
      tick: (localPath, remotePath, error) => {
        error && console.log("文件传输失败");
      },
    });

    console.log("文件传输", status ? "成功" : "失败");
    process.exit();
  } catch (err) {
    console.log("文件传输失败", err);
  }
}
