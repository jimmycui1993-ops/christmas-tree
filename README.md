# Laura，生日快乐

一棵细粒子的生日树。底色是靛蓝到雾蓝的夜色，粒子以暖象牙和雾蓝为主，只带一点香槟金。树冠分层、留有空隙。角落有一株线描白蝴蝶兰，取自礼物设计的花形，不是包装稿本身。

文案来自礼物设计，不是引言：Laura，生日快乐；愿新的一岁，心有热爱，自在绽放；For Laura, with Love。

它从 [moleculemmeng020425/christmas-tree](https://github.com/moleculemmeng020425/christmas-tree) 的交互式粒子树改来：保留聚合成形 / 散开、辉光和轨道控制。

上游 README 写明以 MIT 许可发布。本仓库保留该许可，并在 [LICENSE](LICENSE) 中注明出处。

公开仓库里没有照片。若本机存在 `private/stories/manifest.json`，可以运行 `npm run stories`，把同一来源的 web 图和缩略图放到被 git 忽略的 `public/stories/`。没有这份清单时，树照常运行，不会出现空相框。应用只读取同源的 `stories/album.json`，不会把图片发到外部图床。`laurawithlove.cn` 尚未在这里配置，当前也没有公开部署。

## 运行

需要 Node.js 18 或更新版本。

```bash
npm install
npm run dev
```

开发服务器默认在 `http://127.0.0.1:5173/`。

构建并用本地预览打开生产包：

```bash
npm run build
npm run preview
```

预览默认在 `http://127.0.0.1:4173/`。`dist/` 是静态产物，需要通过静态服务器访问（例如 `npm run preview`）。本仓库不提供公开在线预览地址。

## 操作

- **散作星河**：粒子平滑散成一片星野
- **重聚成树**：粒子再聚回分层的树形，树顶是一小点星光
- **自动旋转**：开或关。拖动时会暂时让出控制
- 鼠标拖动，或在触控屏上单指滑动，可以旋转
- 滚轮或双指可以在一定范围内缩放

画面会按设备降低粒子数量、像素比和辉光强度。系统开启「减少动态效果」时，默认关闭自动旋转，并减弱闪烁。

## 说明

照片热点只出现在清单加载成功之后，数量少于全部照片，点开后按原比例完整查看。分组名称来自清单里的 `era` 字段。`@mediapipe/tasks-vision` 仍留在依赖清单中，但应用不会引用它，也不会调用 `getUserMedia`。
