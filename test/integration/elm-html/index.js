import('./Main.elm').then(Elm => {
  var mountNode = document.getElementById('main');
  var app = Elm.Main.embed(mountNode);
});