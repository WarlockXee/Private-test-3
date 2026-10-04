<?php

declare(strict_types=1);

final class DanbooruImagesExtension extends Minz_Extension {

	/** Danbooru thumbnail URLs as found in its Atom feed, e.g. //cdn.donmai.us/360x360/df/dc/<md5>.jpg */
	private const THUMB_REGEX = '#(?:https?:)?//cdn\.donmai\.us/(?:180x180|360x360|720x720)/([0-9a-f]{2})/([0-9a-f]{2})/([0-9a-f]{32})\.(?:jpg|webp)#i';

	#[\Override]
	public function init(): void {
		$this->registerHook('entry_before_display', [$this, 'rewriteEntry']);
	}

	#[\Override]
	public function handleConfigureAction(): void {
		if (Minz_Request::isPost()) {
			$size = Minz_Request::paramString('size');
			$this->setUserConfiguration([
				'size' => in_array($size, ['720', 'sample'], true) ? $size : '720',
				'proxy' => trim(Minz_Request::paramString('proxy')),
			]);
		}
	}

	public function rewriteEntry(FreshRSS_Entry $entry): FreshRSS_Entry {
		$content = $entry->content();
		if (stripos($content, 'cdn.donmai.us') === false) {
			return $entry;
		}
		$content = preg_replace_callback('#<img\b[^>]*>#i', [$this, 'rewriteImgTag'], $content) ?? $content;
		$entry->_content($content);
		return $entry;
	}

	/** @param array<int,string> $match */
	private function rewriteImgTag(array $match): string {
		$tag = $match[0];
		if (stripos($tag, 'cdn.donmai.us') === false) {
			return $tag;
		}
		$tag = preg_replace_callback(self::THUMB_REGEX, fn(array $m): string => $this->buildUrl($m[1], $m[2], $m[3]), $tag) ?? $tag;
		// The CDN refuses hotlinked images, so never tell it which page is asking
		if (stripos($tag, 'referrerpolicy') === false) {
			$tag = preg_replace('#^<img\b#i', '<img referrerpolicy="no-referrer"', $tag) ?? $tag;
		}
		return $tag;
	}

	private function buildUrl(string $a, string $b, string $md5): string {
		$url = $this->getUserConfigurationValue('size', '720') === 'sample'
			? "https://cdn.donmai.us/sample/$a/$b/sample-$md5.jpg"
			: "https://cdn.donmai.us/720x720/$a/$b/$md5.webp";
		$proxy = (string)$this->getUserConfigurationValue('proxy', '');
		return $proxy === '' ? $url : $proxy . rawurlencode($url);
	}
}
