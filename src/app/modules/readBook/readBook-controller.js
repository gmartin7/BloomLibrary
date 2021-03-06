(function () {
  // to wrap use strict
  "use strict";

  angular
    .module("BloomLibraryApp.readBook", ["ui.router", "restangular"])
    .config(function config($stateProvider) {
      $stateProvider.state("readBook", {
        url: "/readBook/:bookId?bookLang",
        views: {
          "@": {
            templateUrl: "modules/readBook/readBook.tpl.html",
            controller: "ReadBookCtrl"
          }
        },
        title: "Read a book"
      });
    });

  angular.module("BloomLibraryApp.readBook").controller("ReadBookCtrl", [
    "$rootScope",
    "$scope",
    "$state",
    "$stateParams",
    "bookService",
    "sharedService",
    "pageService",
    "$sce",
    function (
      $rootScope,
      $scope,
      $state,
      $stateParams,
      bookService,
      sharedService,
      pageService,
      $sce
    ) {
      // A fairly crude way of testing for IOS, where a click on a button that has a tooltip just
      // shows the tooltip, to the dismay of anyone expecting the button to work.
      $scope.showTooltips =
        !navigator.platform || !/iPad|iPhone|iPod/.test(navigator.platform);
      $scope.canModifyBook = false; // until we get the book and may make it true
      $scope.location = window.location.href; // make available to embed in mailto: links

      //get the book for which we're going to show the details
      bookService.getBookById($stateParams.bookId).then(function (book) {
        $scope.book = book;
        var url = getReadUrl(book);
        $scope.readUrl = $sce.trustAsResourceUrl(url);

        pageService.setTitle(
          _localize("{bookTitle} - Read", { bookTitle: book.title })
        );
      });

      // Listen for messages from the player
      window.addEventListener("message", messageListener);

      function getReadUrl(book) {
        var harvesterBaseUrl = bookService.getHarvesterBaseUrl(book);
        if (!harvesterBaseUrl) {
          return null;
        }
        var bloomPlayerUrl = sharedService.isProductionSite
          ? "https://bloomlibrary.org/bloom-player/bloomplayer.htm"
          : "https://dev.bloomlibrary.org/bloom-player/bloomplayer.htm";

        var bookLang = $stateParams.bookLang;
        var langParam;
        if (bookLang) {
          langParam = "&lang=" + bookLang;
        }

        // use this if you are are working on bloom-player and are using the bloom-player npm script tobloomlibrary
        // bloomPlayerUrl = "http://localhost:3000/bloomplayer-for-developing.htm";
        return (
          bloomPlayerUrl +
          "?url=" +
          harvesterBaseUrl +
          "bloomdigital%2findex.htm" +
          "&showBackButton=true" +
          "&centerVertically=false" +
          "&useOriginalPageSize=true" +
          "&independent=false" +
          "&host=legacy-bloomlibrary" +
          (langParam || "")
        );
      }

      function messageListener(data) {
        // We can get a message here from bloom-player {landscape, canRotate } that we aren't using yet, and which
        // isn't json encoded.
        // The message that we want to ignore is not a string.
        if (!data.data || typeof data.data !== "string") {
          return;
        }
        var message = JSON.parse(data.data);
        var messageType = message.messageType;
        if (messageType === "backButtonClicked") {
          window.removeEventListener("message", messageListener);

          if ($rootScope.navigatedToReadFromDetail) {
            window.history.back();
          } else {
            // The user has navigated to this read page directly.
            // We always want bloom-player's back button to navigate to the detail page.
            $state.go("browse.detail", { bookId: $scope.book.objectId });
          }
        }
      }
    }
  ]);
})(); // end wrap-everything function
